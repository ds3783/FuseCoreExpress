# Lifecycle

Source: [`src/index.mjs`](../../src/index.mjs) · [`src/config.mjs`](../../src/config.mjs) · Spec: [openspec/specs/lifecycle/spec.md](../../openspec/specs/lifecycle/spec.md) · Back to [README](../../README.md#documentation)

## Overview

FuseCore's default export is a `Proxy` over a singleton that bootstraps every internal module (`cache`, `log`, `request`, `manifest`, `monitor`, `ajax`) through a single `init(options)` call and tears them down via `shutdown()`. Before `init` resolves, every module property on the default export is backed by a **null implementation** so that public APIs (e.g. `FuseCore.logger.info`) can be called from anywhere — startup hooks, top-level module code, error paths — without throwing. After `init` resolves, property access transparently switches to the live module instances, and the framework emits an `INITED` event.

## Init Options

The full merged config schema lives in [`src/config.mjs`](../../src/config.mjs). The top-level shape, with defaults applied:

| Option | Type | Default | Description |
|---|---|---|---|
| `common.expressApp` | Express app | `null` | Used by `request` and `monitor` to register middleware. |
| `common.listenHostname` | string | `''` | Hostname HTTP server listens on (advisory). |
| `common.listenPort` | number | `3000` | Port HTTP server listens on (advisory). |
| `cache` | object | see [cache](cache.md) | Cache backend selection. |
| `log` | object | see [log](log.md) | Log directory, level, console takeover. |
| `ajax` | object | see [ajax](ajax.md) | HTTP client defaults. |
| `manifest` | object | see [manifest](manifest.md) | Manifest directory + selected entry. |
| `monitor` | object | see [monitor](monitor.md) | Metric affix, mem/cpu/4xx/5xx auto-sampling. |
| `isPrimaryProcess` | boolean | `cluster.isPrimary \|\| cluster.isMaster` | Toggles cluster-aware behavior (logZipper/logCleaner cron, monitor primary vs. worker role). |

User-supplied options are deep-merged onto the defaults before being passed to each module's `init`.

## API

### `init(options) → Promise<void>`

Asynchronously initialize every internal module in fixed order: `cache → log → request → manifest → monitor → ajax`. Each module's `init` is awaited (async) or called synchronously, then the resulting instance is attached to the FuseCore singleton under its module name. After all modules initialize, the `INITED` event fires and `isInitialized` becomes `true`.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `options` | object | Partial config; deep-merged onto `DefaultConfig`. May omit any field. |

**Returns**: `Promise<void>` that resolves once every module's `init` has completed.

**Throws**: any error a module's `init` throws (e.g. unreachable Redis when `cache.impl: 'redis'`, missing manifest entry).

**Example 1 — minimal init/shutdown tied to an Express app**

```javascript
import express from 'express';
import FuseCore from 'fuse-core-express';

const app = express();

await FuseCore.init({
    common: { expressApp: app, listenPort: 3000 },
    log: { path: './logs', level: 'info' },
    cache: { impl: 'memory' },
    manifest: { path: './manifests', name: 'prod' },
    monitor: { mem: true, cpu: true, req404: true, req5xx: true }
});

app.get('/hello', (req, res) => res.send('ok'));
const server = app.listen(3000);

process.on('SIGTERM', async () => {
    server.close();
    await FuseCore.shutdown();
    process.exit(0);
});
```

### `shutdown() → Promise<void>`

Asynchronously tear down every initialized module in the same declared order. Each module's `shutdown` (if defined) is awaited or called. Emits the `SHUTDOWN` event and clears `isInitialized`. A no-op if `init` never resolved.

**Returns**: `Promise<void>`.

**Example — graceful shutdown**

```javascript
await FuseCore.shutdown();
console.log(FuseCore.isInitialized); // false
```

### `isInitialized` (property)

Boolean flag; `true` once `init` has completed, `false` before init or after `shutdown`.

```javascript
if (!FuseCore.isInitialized) {
    await FuseCore.init({ /* ... */ });
}
```

### `on(event, callback) → void`

Subscribe to lifecycle events. Available **before** `init` (the listener is registered against the null-instance's emitter, which is the same emitter used by the live instance).

**Parameters**

| Name | Type | Description |
|---|---|---|
| `event` | string | One of `'INITED'`, `'SHUTDOWN'`. |
| `callback` | function | Called with no arguments when the event fires. |

### `off(event, callback) → void`

Unsubscribe a previously registered listener.

**Example — subscribing to `INITED` and `SHUTDOWN`**

```javascript
import FuseCore from 'fuse-core-express';

FuseCore.on('INITED', () => {
    FuseCore.logger.info('FuseCore is ready, wiring up routes');
});

FuseCore.on('SHUTDOWN', () => {
    console._log
        ? console._log('FuseCore stopped (console takeover was active)')
        : console.log('FuseCore stopped');
});

await FuseCore.init({ log: { path: './logs', takeOverConsole: true } });
// ...
await FuseCore.shutdown();
```

## Pre-Init Behavior (Null Implementation)

Before `init` resolves, the default export is still safe to use:

- `FuseCore.logger.info(...)` → routed to the matching `console` method.
- `FuseCore.cache.get(...)` → rejects with `Cache module haven't initialized!` (intentional: cache calls before init are almost always bugs).
- `FuseCore.on(...)` / `FuseCore.off(...)` → register against the shared emitter and fire once `INITED` lands.

This lets you wire up listeners in top-level module code and only call `init` from your bootstrap entry point.

## Lifecycle Events

| Event | Emitted when |
|---|---|
| `INITED` | After every module's `init` resolves. |
| `SHUTDOWN` | After every module's `shutdown` resolves. |

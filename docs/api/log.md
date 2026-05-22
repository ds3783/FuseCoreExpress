# Log

Source: [`src/lib/log/`](../../src/lib/log/) · Spec: [openspec/specs/log/spec.md](../../openspec/specs/log/spec.md) · Back to [README](../../README.md#documentation)

## Overview

Daily-rotating file logger built on [`tracer`](https://www.npmjs.com/package/tracer), with three separate output streams: `info` (all levels), `error` (error-and-above), and `slow` (manual slow-path entries). Two scheduled cron tasks run on the primary process: at **01:00** local time, yesterday's date-named `.log` files are gzipped via `tar zcf`; at **02:00**, log files older than **15 days** are deleted. Calls made before `init` are routed through the matching `console` method, so log lines from module top-level code are never lost.

## Init Options

| Option | Type | Default | Description |
|---|---|---|---|
| `log.path` | string | `''` | Directory for log files. If empty, no file logging is configured. |
| `log.level` | `'trace'` \| `'debug'` \| `'info'` \| `'warn'` \| `'error'` \| `'fatal'` | `'info'` | Minimum level written to the `info` log file. The `error` log file is fixed at `error` level. |
| `log.takeOverConsole` | boolean | `false` | Replace `console.log/debug/info/warn/error/trace` with the FuseCore logger. Originals are preserved on `console._log` etc. |
| `log.extraZipStreams` | Writable[] | `[]` | Additional writable streams that get a `\n` poke right before the daily compression cron runs (forces upstream loggers to rotate). |
| `log.extraOutputStreams` | `{ info?: Writable \| Writable[], error?: Writable \| Writable[] }` | `null` | Extra destinations for info-level and error-level lines (e.g. `process.stdout`). |

## API

### `log.getLogger() → Logger`

Return the live logger. After `init`, it writes to the configured daily files (and any `extraOutputStreams`). Before `init`, it falls back to `console.*`.

### `log.getLogDir() → string`

Return the configured log directory (`log.path`), or `''` if none was set.

### Logger Interface

The object returned by `getLogger()` (also reachable as `FuseCore.logger`) carries these methods. All accept the same `(...args)` signature as `console.log` — primitives are stringified, objects are inspected.

| Method | Daily file(s) written | Console fallback (pre-init) |
|---|---|---|
| `trace(...)` | `info` | `console.trace` |
| `debug(...)` | `info` | `console.debug` |
| `info(...)` | `info` | `console.info` |
| `warn(...)` | `info` | `console.warn` |
| `error(...)` | `info`, `error` | `console.error` |
| `fatal(...)` | `info`, `error` (alias of error) | `console.error` |
| `slow(...)` | `slow` (only) | `console.log` |

Log lines are formatted as `[<timestamp>] [<level>]@(<file>:<line>) - <message>` and stored under `<log.path>/{info,error,slow}.<YYYY-MM-DD>.log`.

**Example 1 — basic info/error logging with file output**

```javascript
import FuseCore from 'fuse-core-express';
import path from 'path';

await FuseCore.init({
    log: { path: path.join(process.cwd(), 'logs'), level: 'info' }
});

const logger = FuseCore.logger;

logger.info('server started on :3000');
logger.error('failed to load user', new Error('not found'));
logger.slow('GET /api/report took 4800ms');
// → ./logs/info.2025-01-15.log    (info + error lines)
// → ./logs/error.2025-01-15.log   (error line only)
// → ./logs/slow.2025-01-15.log    (slow line only)
```

**Example 2 — `takeOverConsole` redirects `console.log` to the file logger**

```javascript
await FuseCore.init({
    log: { path: './logs', takeOverConsole: true }
});

console.log('this lands in info.YYYY-MM-DD.log via logger.info');
console.error('this lands in error.YYYY-MM-DD.log via logger.error');

// originals preserved if you ever need to bypass:
console._log('this goes to the real stdout');
```

**Example 3 — extra output streams**

```javascript
import { createWriteStream } from 'fs';

const auditStream = createWriteStream('/var/log/app/audit.ndjson', { flags: 'a' });

await FuseCore.init({
    log: {
        path: './logs',
        extraOutputStreams: {
            info: process.stdout,           // mirror info to stdout
            error: [process.stderr, auditStream] // mirror error to stderr AND audit file
        }
    }
});
```

## Automatic Log Compression

On the primary process, a cron task runs daily at **01:00** local time:

1. For each `Writable` in `log.extraZipStreams`, write a single `\n` (this nudges upstream loggers to rotate their daily file).
2. List every file in `log.path` matching `^.*\d{8}.*\.log$`.
3. For each file whose embedded date is NOT today, run `tar zcf <name>.log.gz <name>.log` and delete the original on success.

Worker processes do not run this task — they leave the primary to own log rotation.

## Automatic Log Cleanup

On the primary process, a cron task runs daily at **02:00** local time:

1. List every file in `log.path` whose name contains an embedded date in `YYYYMMDD` or `YYYY-MM-DD` form.
2. Delete any file whose embedded date is more than **15 days** before today (midnight).

Worker processes do not run this task.

## Pre-Init Behavior

Calls to `FuseCore.logger.info(...)` (etc.) before `FuseCore.init()` resolves are routed to the matching `console` method. This means you can put `FuseCore.logger.info('module loaded')` at the top of any module without ordering the import after init.

# Manifest

Source: [`src/lib/manifest/`](../../src/lib/manifest/) · Spec: [openspec/specs/manifest/spec.md](../../openspec/specs/manifest/spec.md) · Back to [README](../../README.md#documentation)

## Overview

The manifest module loads structured configuration from one or more `.js`/`.mjs` files in a configured directory, walks an `extends` inheritance chain to merge them, and exposes deep-property lookups by dot-path. It also resolves backend URLs through `getBackendUrl(server, path, version)`, which the [ajax](ajax.md) module uses to turn `{ server: 'lottery', path: '/draw' }` into an absolute URL.

## Init Options

| Option | Type | Default | Description |
|---|---|---|---|
| `manifest.path` | string | `''` | Directory containing manifest files. Resolved against `process.cwd()` if relative. If empty or missing, the in-memory manifest is `{}`. |
| `manifest.name` | string | — | Name of the manifest entry to use as the root. Must match the basename (no extension) of one of the files in `manifest.path`. |

### File format

Each file in `manifest.path` exports a configuration object of shape:

```javascript
// manifests/base.mjs
export default {
    extends: undefined,        // or another manifest's basename
    data: {
        defaultVersion: { base: 'v1' },
        server: {
            lottery:  'https://lottery.example/${version}',
            property: 'https://property.example/${version}'
        }
    }
};
```

```javascript
// manifests/prod.mjs
export default {
    extends: 'base',
    data: {
        defaultVersion: { lottery: 'v5' }
    }
};
```

With `manifest.name: 'prod'`, the merged manifest becomes:

```javascript
{
    defaultVersion: { base: 'v1', lottery: 'v5' },
    server: { lottery: '...', property: '...' }
}
```

### Loading semantics

- Files matching `/\.m?js$/i` are loaded; any other extension is skipped with a warning.
- Each file is first attempted via `require()`. If `require` throws (typical for ESM-only modules in this codebase), the loader falls back to dynamic `import()`.
- If `require()` returns a value flagged as an ESM Module (`Symbol.toStringTag === 'Module'`), the loader throws an error containing `Cannot load ESM module using require() in ESM environment` — this surfaces an ESM/CJS misconfiguration rather than silently using a half-loaded module.
- The selected root manifest must exist; otherwise init throws `Manifest config not found: <name>`.

## API

### `manifest.get(key, ignoreNonExistsKey?) → any`

Resolve a dot-separated property path against the merged manifest.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `key` | string | Dot-separated property path, e.g. `'server.lottery'`. |
| `ignoreNonExistsKey` | boolean (optional) | If truthy, return `null` instead of throwing when the path doesn't resolve. |

**Returns**: the resolved value.

**Throws**: `Invalid manifest key: <key>` if the path doesn't resolve (and `ignoreNonExistsKey` is falsy), or if `key` is not a non-empty string.

**Example 1 — throwing variant (default)**

```javascript
const url = FuseCore.manifest.get('server.lottery');
// 'https://lottery.example/${version}'

FuseCore.manifest.get('server.unknownService');
// throws: Invalid manifest key: server.unknownService
```

**Example 2 — `ignoreNonExistsKey: true`**

```javascript
const optional = FuseCore.manifest.get('feature.beta.enabled', true);
// null if any segment along the path is missing
if (optional) {
    enableBetaFeature();
}
```

### `manifest.getBackendUrl(server, path, version?) → string`

Resolve an absolute backend URL by substituting `${version}` in the manifest's `server.<server>` template, then appending `path`.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `server` | string | Server code defined under `server.*` in the manifest. |
| `path` | string (optional) | Path appended to the resolved server URL. |
| `version` | string (optional) | Explicit version. If omitted, falls back to `defaultVersion.<server>`, then `defaultVersion.base`. |

**Returns**: the assembled URL string.

**Example 1 — explicit `version` argument wins**

Manifest:

```javascript
{ defaultVersion: { base: 'v1', products: 'v3' },
  server: { products: 'https://api.example/${version}' } }
```

Call:

```javascript
FuseCore.manifest.getBackendUrl('products', '/list', 'v5');
// → 'https://api.example/v5/list'
```

**Example 2 — fallback chain (per-server default → base default)**

```javascript
FuseCore.manifest.getBackendUrl('products', '/list');
// no explicit version → uses defaultVersion.products = 'v3'
// → 'https://api.example/v3/list'

// Suppose defaultVersion.products is also unset:
FuseCore.manifest.getBackendUrl('products', '/list');
// falls back to defaultVersion.base = 'v1'
// → 'https://api.example/v1/list'

// Empty path: just the server URL with version substituted:
FuseCore.manifest.getBackendUrl('products');
// → 'https://api.example/v3'
```

## Recommendations

- Keep one **environment-shared base manifest** plus thin per-environment overrides via `extends`. This is the pattern the loader is optimized for.
- Manifest files run at init time. Avoid putting side-effectful code in them — keep them to declarative `export default { extends, data }` shapes.
- The `${version}` placeholder is the only string-substitution the loader performs. If you need other dynamic values, resolve them at call sites.

# Cache

Source: [`src/lib/cache/`](../../src/lib/cache/) · Spec: [openspec/specs/cache/spec.md](../../openspec/specs/cache/spec.md) · Back to [README](../../README.md#documentation)

## Overview

A unified async key/value cache with two interchangeable backends — in-process **memory** and **Redis**. The `get`/`set` API is identical across backends, so application code can switch implementations purely through configuration. Values are typed-preserved on Redis (strings stay strings, objects round-trip through JSON), expired entries return `null`, and setting `null` deletes the key.

## Init Options

| Option | Type | Default | Description |
|---|---|---|---|
| `cache.impl` | `'memory'` \| `'redis'` | `'memory'` | Backend selection. Any other value causes `init` to throw. |
| `cache.redis.url` | string | `'redis://localhost:6379'` | Redis connection URL. Supports `redis://`, `rediss://`, password, database index. |
| `cache.redis.enableTls` | boolean | `false` | Enable TLS on the socket. |
| `cache.redis.clientOptions` | object | `{}` | Additional `redis` v4 client options (password, database, etc.) merged onto the connection config. |

## API

### `cache.get(key) → Promise<any>`

Resolve to the value previously stored under `key`, or `null` if the key was never set, has expired, or was deleted.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `key` | string | Cache key. |

**Returns**: `Promise<any | null>`.

**Throws**: if `init` has not installed a backend, the promise rejects with `Cache module haven't initialized!`.

### `cache.set(key, value, timeoutSeconds?) → Promise<any>`

Store `value` under `key` for `timeoutSeconds` seconds. The returned promise resolves to the **previous** value (or `null` if there was none). Setting `value` to `null`/`undefined` deletes the key. Setting `timeoutSeconds` to `0` or a negative number means the entry never expires (until explicitly deleted or the backend is flushed).

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `key` | string | — | Cache key. |
| `value` | any | — | Value to store. `null`/`undefined` deletes. |
| `timeoutSeconds` | number | `300` | TTL in seconds. `≤ 0` means no expiration. |

**Returns**: `Promise<any | null>` — the previous value bound to `key`.

**Example 1 — minimal memory backend**

```javascript
await FuseCore.init({ cache: { impl: 'memory' } });
const cache = FuseCore.cache;

await cache.set('propName', 'propValue', 30);
const value = await cache.get('propName');
console.log(value); // 'propValue'
```

**Example 2 — Redis backend with explicit TTL**

```javascript
await FuseCore.init({
    cache: {
        impl: 'redis',
        redis: {
            url: 'redis://localhost:6379',
            enableTls: false,
            clientOptions: { database: 1 }
        }
    }
});

const cache = FuseCore.cache;

await cache.set('user:123', { name: 'John', age: 30 }, 3600);
const user = await cache.get('user:123');
console.log(user); // { name: 'John', age: 30 }
```

**Example 3 — deletion via null value**

```javascript
await cache.set('temp', 'hello', 60);
await cache.set('temp', null);                  // deletes the key
console.log(await cache.get('temp'));           // null
```

**Example 4 — never-expires entry**

```javascript
await cache.set('config:flags', { ab: 'B' }, 0);   // 0 → never expires
await cache.set('session:abc', 'data', -1);        // negative also means never expires
```

### `cache.exists(key) → Promise<boolean>` *(Redis backend only)*

Resolve to `true` if the key currently exists in Redis, `false` otherwise.

```javascript
const has = await cache.exists('user:123');
```

### `cache.expire(key, seconds) → Promise<boolean>` *(Redis backend only)*

Set or refresh the TTL on an existing key. Resolves to `true` if the TTL was applied, `false` if the key does not exist.

```javascript
await cache.set('session:abc', 'data');
await cache.expire('session:abc', 600); // 10 minutes
```

### `cache.ttl(key) → Promise<number>` *(Redis backend only)*

Resolve to the remaining seconds before `key` expires. Redis-native return semantics apply: `-1` for keys with no expiration, `-2` for missing keys.

```javascript
const remaining = await cache.ttl('session:abc');
```

### `cache.keys(pattern) → Promise<string[]>` *(Redis backend only)*

Resolve to all keys matching the glob `pattern`. Prefer fine-grained patterns over `*` in production.

```javascript
const userKeys = await cache.keys('user:*');
```

### `cache.flushAll() → Promise<void>` *(Redis backend only)*

Delete every key in the current Redis database. **Destructive — use only in tests or fresh environments.**

```javascript
await cache.flushAll();
```

## Type Preservation Notes (Redis backend)

Values are tagged on write with one of two prefixes:

- `__FUSE_STR__:` — original was a string. On read, the prefix is stripped and the raw string is returned (so `JSON.parse` is never applied to data that happened to look like JSON).
- `__FUSE_OBJ__:` — original was a non-string. On read, the suffix is `JSON.parse`-d back into an object/number/array/boolean.

Legacy values written by older clients without the prefix are still readable: the cache attempts `JSON.parse` and falls back to returning the raw string if parsing fails.

## Memory Backend Notes

- Entries are stored in a process-local object map.
- A 60-second interval sweeps expired entries; entries are also invisible to `get` between sweeps (expiration is checked at read time as well).
- All cache state is lost on process exit. Use Redis if you need persistence or cross-worker sharing.

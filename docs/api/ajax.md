# Ajax

Source: [`src/lib/ajax/`](../../src/lib/ajax/) · Spec: [openspec/specs/ajax/spec.md](../../openspec/specs/ajax/spec.md) · Back to [README](../../README.md#documentation)

## Overview

Three HTTP client primitives built on Node's native `http`/`https`:

- [`ajax.request`](#ajaxrequestoptions--promiseresponseenvelope) — fire-and-await JSON/form/binary/multipart request, returns a parsed envelope.
- [`ajax.proxy`](#ajaxproxyoptions--promiseresponseenvelope) — stream-through proxy: pipes the inbound request body to the upstream and the upstream response back to `options.res`.
- [`ajax.requestAll`](#ajaxrequestalloptionsarray--promiseresponseenvelope) — concurrent fan-out, never rejects.

URLs are resolved through the [manifest](manifest.md) module: pass `server` + optional `version` + `path` and the absolute URL is composed via `manifest.getBackendUrl`. Defaults (timeout, slow threshold, headers, global agent options) are set at `FuseCore.init` time.

## Init Options

| Option | Type | Default | Description |
|---|---|---|---|
| `ajax.timeout` | number (ms) | `10000` | Default request timeout. Overridable per request via `options.timeout`. |
| `ajax.slowThreshold` | number (ms) | `3000` | Successful requests slower than this are also written to the slow log via `FuseCore.logger.slow`. |
| `ajax.defaultHeaders` | object | `{ "X-Requested-With": "FuseCore Web component V1.0" }` | Headers applied first; can be overridden by forwarded `req.headers` or `options.headers`. |
| `ajax.agentOptions` | object | `{}` | Options merged onto **both** Node's `http.globalAgent.options` and `https.globalAgent.options`. Use this to tune `keepAlive`, `maxSockets`, etc. globally. |

## Request Options Reference

Every primitive accepts the same options object (subset relevant per primitive):

| Option | Type | Default | Description |
|---|---|---|---|
| `server` | string | `'base'` | Server code defined in the manifest. Maps via `manifest.getBackendUrl` to a base URL with `${version}` substitution. |
| `version` | string | — | Overrides the version segment. Falls back to `defaultVersion.<server>` then `defaultVersion.base` from the manifest. |
| `path` | string | — | Path appended to the resolved server URL. |
| `url` | string | — | Bypass `manifest` entirely and use this absolute URL. If provided, `server`/`version` are ignored. |
| `data` | object | `{}` | Request payload. For `GET`/`HEAD`/`OPTIONS` it becomes the query string; otherwise it is the body. |
| `method` | string | `'GET'` | HTTP method. |
| `timeout` | number (ms) | `ajax.timeout` | Per-request timeout. Setting any custom value forces use of the global agent (no socket pooling). |
| `reqContentType` (alias `dataType`) | `'json'` \| `'form'` \| `'multipart'` \| `'binary'` | `'form'` | Request body encoding. `'form'` is `application/x-www-form-urlencoded`. `'json'` sets `Content-Type: application/json` and JSON-stringifies. `'multipart'` builds a `multipart/form-data` body where object values `{ name, binary }` become file parts. `'binary'` sets `Content-Type: application/octet-stream`. |
| `resContentType` (alias `contentType`) | `'json'` \| `'stream'` \| (other) | auto | Decide response parsing. `'json'` forces `JSON.parse`. `'stream'` resolves immediately with `raw` set to the decompressed response stream (no body buffering). If omitted, JSON is parsed only when upstream `Content-Type` matches `application/json`. |
| `headers` | object | `{}` | Headers that override anything forwarded from `req.headers`. |
| `isWeb` | boolean | `false` | **Composite flag** for browser-style requests. When true: (1) `Accept-Language` is replaced with the value of the inbound `N1` cookie (or `'en'` if absent), and (2) if the inbound `token` cookie exists, `Authorization` is set to its value. |
| `anonymous` | boolean | `false` | Strips the `Authorization` header from the outbound request. Used to bypass the `isWeb` token→Authorization behavior on a per-call basis. |
| `noCache` | boolean | `true` | When true (default), strips `If-Modified-Since` and `If-None-Match` from forwarded headers and sets `Cache-Control: no-cache`. |
| `passClientIP` | boolean | `true` | When false, strips `X-Forwarded-For` and `X-Real-IP` from forwarded headers. |
| `req` | Express `req` | — | If provided, most of `req.headers` are forwarded to upstream (minus a reserved list per primitive: `host`, `accept`, `accept-encoding`, `connection`, `content-length` for `request`; `host`, `connection` for `proxy`). For `proxy`, the inbound request body is piped to upstream — `req` is **required**. |
| `res` | Express `res` | — | For `proxy`, the upstream response is piped to `res`. **Required for `proxy`**, ignored by `request`/`requestAll`. |
| `performance` | boolean | `false` | If true, the resolved envelope's `duration` field carries a more precise `[seconds, nanoseconds]` measurement (`process.hrtime` based). |
| `proxy` | string \| object | — | Outbound HTTP proxy. String form: `'http://user:pass@host:port'`. Object form: `{ protocol, host, port, user?, password? }`. |
| `cname` | string | — | Diagnostic label for this call (appears in the ajax logger output). |

### Reserved headers (not forwarded from `req.headers`)

- `request`: `host`, `accept`, `accept-encoding`, `connection`, `content-length`
- `proxy`: `host`, `connection`

`options.headers` is applied **after** the reserved-set filter, so explicit headers always override forwarded ones.

## Response Envelope Reference

Every resolved value AND every rejected value is shaped the same:

```typescript
interface ResponseEnvelope {
    ok: boolean;             // true only on 2xx with successful body parsing
    status: number;          // upstream HTTP status; 0 on network/transport errors
    message: string;         // populated when not ok
    error: Error | null;     // populated when not ok and a JS error was the cause
    data: any;               // parsed body — object for JSON, string/Buffer otherwise
    raw: string | Buffer | NodeJS.ReadableStream | null;
    headers: Record<string, string> | null;
    totalCount: number | null; // from upstream X-Total-Count header
    duration: [number, number]; // [seconds, nanoseconds] from process.hrtime
}
```

Notes:

- The envelope is reused as the **reject** value too — `.catch(err => err.status, err.data, ...)` works.
- For `resContentType: 'stream'`, `raw` is the (decompressed) response stream, `data` is unset.
- Unknown `Content-Encoding` values are passed through; the envelope's `headers['x-warn']` is set to `Unrecognized Content-Encoding`.

## API

### `ajax.request(options) → Promise<ResponseEnvelope>`

Fire-and-await an HTTP request. Body is fully buffered, decompressed (`gzip` / `deflate` / `br` supported), and parsed according to `resContentType` or the response `Content-Type`.

**Example 1 — GET with query data**

```javascript
const ret = await FuseCore.ajax.request({
    server: 'property',
    version: 'v4.6',
    path: '/nearby',
    data: { lat: 1.3521, lng: 103.8198, radius: 500 }
});
// → GET https://property/v4.6/nearby?lat=1.3521&lng=103.8198&radius=500

if (ret.ok) {
    res.json(ret.data);
} else {
    FuseCore.logger.error('property/nearby failed', ret);
    res.status(ret.status || 500).end();
}
```

**Example 2 — POST JSON with explicit timeout, propagating req headers**

```javascript
app.post('/orders', async (req, res) => {
    try {
        const ret = await FuseCore.ajax.request({
            server: 'orders',
            path: '/create',
            method: 'POST',
            reqContentType: 'json',
            data: req.body,
            timeout: 3000,
            isWeb: true,   // forwards Authorization from `token` cookie + N1-based Accept-Language
            req                  // forwards most req.headers (X-Forwarded-For, User-Agent, ...)
        });
        res.json(ret.data);
    } catch (err) {
        FuseCore.logger.error('order create failed', err.message, err.error);
        res.status(err.status || 500).end();
    }
});
```

### `ajax.proxy(options) → Promise<ResponseEnvelope>`

Stream the inbound request body to upstream and pipe the upstream response straight back to `options.res`. Useful for SSR routes that need to forward authentication and headers but do not want to touch the body.

- `options.req` and `options.res` are both **required**.
- On success, status/headers/body are written to `res` before the promise resolves; the resolved envelope's `raw` is **not** the full body (it was streamed).
- If the upstream connection fails (`status === 0`), the caller is responsible for ending the response (e.g. `res.status(500).end()`). For any non-zero status the proxy has already written to `res`.

**Example 1 — SSR proxy passthrough**

```javascript
app.all('/api/property/*', async (req, res) => {
    try {
        await FuseCore.ajax.proxy({
            server: 'property',
            path: req.url.replace(/^\/api\/property/, ''),
            method: req.method,
            req,
            res,
            headers: { origin: 'https://property-staging.example' }
        });
    } catch (err) {
        FuseCore.logger.error('property proxy failed', err.message);
        if (!err.status) res.status(502).end(); // network failure: nothing was written yet
    }
});
```

**Example 2 — multipart upload passthrough**

```javascript
app.post('/api/property/upload', async (req, res) => {
    await FuseCore.ajax.proxy({
        server: 'property',
        path: '/images/upload',
        method: 'POST',
        req,                     // body stream is piped to upstream
        res,
        timeout: 30000,
        reqContentType: 'multipart' // pass through as-is; we don't reassemble
    }).catch(err => {
        FuseCore.logger.error('image upload failed', err.message);
        if (!err.status) res.status(500).end();
    });
});
```

### `ajax.requestAll(optionsArray) → Promise<ResponseEnvelope[]>`

Execute every entry concurrently. The aggregate promise **never rejects** — individual failures appear as envelopes with `ok: false` and `data: null`. Order of the returned array matches input order.

**Example — mixed success/failure with per-entry check**

```javascript
const [propertyData, newsData] = await FuseCore.ajax.requestAll([
    {
        server: 'property',
        version: 'v4.6',
        timeout: 3000,
        path: '/nearby'
    },
    {
        server: 'news',
        version: 'v4.8',
        path: '/news'
    }
]);

if (!newsData.ok) {
    FuseCore.logger.warn('news service down, degrading', newsData.message);
    res.render('only-property', propertyData.data);
} else {
    res.render('full-content', {
        property: propertyData.data,
        news: newsData.data
    });
}
```

Pass a non-array value and the resolved array is `[]`.

## Observability Hooks

- **Slow log**: any successful request whose duration exceeds `ajax.slowThreshold` is also written to the slow logger via `FuseCore.logger.slow`. See [log](log.md).
- **Monitor**: ajax outcomes (success, fail, timeout) are recorded as counters/values against the [monitor](monitor.md) module.
- **General log**: every request is logged at `debug` on start and at `info`/`error` on completion via `FuseCore.logger`.

## Notes

- `data` is `URLSearchParams`-encoded by default. Nested object values are **not** deep-encoded — flatten them at the call site if needed.
- Setting any non-default `timeout` (or providing `options.url`) opts out of the per-server agent pool and uses the global agent. Heavy load against an upstream is best served by leaving `timeout` defaulted so agent pooling kicks in.
- `cname` is purely diagnostic and shows up in ajax log lines to help disambiguate calls in busy services.

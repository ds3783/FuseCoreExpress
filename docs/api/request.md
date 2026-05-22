# Request

Source: [`src/lib/request/`](../../src/lib/request/) · Spec: [openspec/specs/request/spec.md](../../openspec/specs/request/spec.md) · Back to [README](../../README.md#documentation)

## Overview

The `request` module installs an Express middleware that normalizes incoming requests behind reverse proxies (nginx, ELB) and exposes two helpers for parsing User-Agent and Accept-Language. It is automatically wired into the Express app passed via `common.expressApp` during `FuseCore.init`.

## Init Options

| Option | Type | Default | Description |
|---|---|---|---|
| `common.expressApp` | Express app | `null` | If set, the request filter is registered via `app.use(filter)` during init. If omitted, the helpers (`getUAInfo`, `getLangInfo`) still work but the filter is not mounted. |

> The Express app is configured via the `common` group, not a `request` group — see [lifecycle.md](lifecycle.md) for the full merged config schema.

## Auto-Registered Filter Side Effects

Once registered, the filter runs on every request before any of your route handlers and mutates `req` as follows:

### `req.ip` override

The filter computes the real client IP by inspecting (in order):

1. `req.ips` (Express's parsed `X-Forwarded-For`), **reversed**
2. `x-real-ip` header
3. `req._remoteAddress`

The first non-empty IP that is NOT in a private range is selected. Private ranges considered internal:

- `10.0.0.0 – 10.255.255.255`
- `172.16.0.0 – 172.31.255.255`
- `192.168.0.0 – 192.168.255.255`

If a non-empty real IP is found, the filter overrides `req.ip` (via `__defineGetter__`) to return that value. If every candidate IP is private, `req.ip` is left alone.

> Note: ensure `app.set('trust proxy', ...)` is configured upstream of FuseCore if you want Express to populate `req.ips` from `X-Forwarded-For` in the first place.

### `req.realUrl`

The filter defines a getter that returns the value of the `x-original-url` header (or `''` if absent). nginx and similar proxies set this header to the URL the client originally requested, before any rewrites.

## API

### `request.getUAInfo(req) → UAInfo`

Parse `req.headers['user-agent']` into a typed descriptor.

**Returns**

```typescript
interface UAInfo {
    isBot: boolean;
    isWinPhone: boolean;
    isIPhone: boolean;
    isIPad: boolean;
    isAndroid: boolean;
    isAndroidTablet: boolean;
    isTablet: boolean;        // isIPad || isAndroidTablet
    isOtherMobile: boolean;
    isMobile: boolean;
    isWechatMiniProg: boolean;
    platform: 'windows' | 'ios' | 'android' | 'linux' | 'macos' | 'whatsapp' | 'compatible' | 'unknown';
    platformVersion: string;  // e.g. '10.3.1', '' if unknown
    browser:  'msie' | 'opera' | 'chrome' | 'firefox' | 'facebook' | 'weixin' | 'safari' | 'unknown';
    browserVersion: string;
}
```

**Example 1 — detecting iPhone Safari**

```javascript
app.get('/track', (req, res) => {
    const ua = FuseCore.request.getUAInfo(req);
    if (ua.isIPhone && ua.browser === 'safari') {
        res.set('X-Render-Variant', 'ios-native');
    }
    res.send('ok');
});
```

**Example 2 — detecting bot traffic**

```javascript
app.use((req, res, next) => {
    const ua = FuseCore.request.getUAInfo(req);
    if (ua.isBot) {
        // skip session creation, skip A/B assignment, cache aggressively
        req.isBot = true;
        res.set('X-Robots-Tag', 'index, follow');
    }
    next();
});
```

### `request.getLangInfo(req, is4PC?) → LangInfo`

Parse `req.headers['accept-language']` into a normalized descriptor. The `is4PC` flag toggles the language-resolution policy: when serving a PC web page (`is4PC = true`), preference is given to the `N1` cookie; otherwise the highest-weighted Accept-Language entry wins.

**Returns**

```typescript
interface LangInfo {
    languages: Record<string, string>; // { 'zh-CN': '1', 'en': '0.6', ... }
    primaryLanguage: string[];          // codes that share the max q-weight
    isEnglish: boolean;
    lang: 'en' | 'zh-cn';
}
```

**Resolution rules**

- `is4PC = true`: if `req.cookies['N1']` exists, `isEnglish = (N1 !== 'zh-cn')`. If `N1` is absent, `isEnglish = true`.
- `is4PC = false/undefined`: `isEnglish = true` unless `primaryLanguage` contains any code matching `^zh-`.

**Example 1 — parsing q-weighted Accept-Language**

```javascript
app.get('/i18n/test', (req, res) => {
    // Accept-Language: zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4
    const li = FuseCore.request.getLangInfo(req);
    // li.languages       → { 'zh-CN':'1', 'zh':'0.8', 'en':'0.6', 'zh-TW':'0.4' }
    // li.primaryLanguage → ['zh-CN']
    // li.isEnglish       → false
    // li.lang            → 'zh-cn'
    res.json(li);
});
```

**Example 2 — PC mode honoring N1 cookie**

```javascript
import cookieParser from 'cookie-parser';
app.use(cookieParser());

app.get('/', (req, res) => {
    const li = FuseCore.request.getLangInfo(req, /* is4PC = */ true);
    // Cookie: N1=zh-cn  →  isEnglish = false, lang = 'zh-cn'
    // Cookie: N1=en     →  isEnglish = true,  lang = 'en'
    // Cookie absent     →  isEnglish = true,  lang = 'en'
    res.render(li.isEnglish ? 'home-en' : 'home-cn');
});
```

## Notes

- The filter uses `req.__defineGetter__` to override `req.ip`. Express's `req.ip` is otherwise a read-only getter; the legacy `__defineGetter__` API is intentional here because it takes precedence over the prototype-level definition.
- Both helpers are pure functions of the request headers — they do not require `FuseCore.init` to have completed and are safe to call from any middleware position.

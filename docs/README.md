# FuseCore Documentation

This directory contains the developer-facing reference for **FuseCore** (`fuse-core-express`). For project overview and quickstart, see the [top-level README](../README.md).

## Per-Module API Reference

| Module | What it covers |
|---|---|
| [lifecycle](api/lifecycle.md) | `init` / `shutdown`, the merged config schema, `INITED`/`SHUTDOWN` events, the null-implementation behavior before init |
| [cache](api/cache.md) | Unified async key/value cache with `memory` and `redis` backends |
| [log](api/log.md) | File-rotating logger, automatic compression and retention cleanup, optional `console` takeover |
| [request](api/request.md) | Express filter that normalizes `req.ip` / `req.realUrl` behind reverse proxies, plus `getUAInfo` / `getLangInfo` |
| [manifest](api/manifest.md) | Directory-based config with `extends` inheritance and `getBackendUrl` resolution |
| [monitor](api/monitor.md) | Counter / value metrics, automatic per-request and memory/CPU sampling, `Monitor.jsp` HTTP endpoint |
| [ajax](api/ajax.md) | `request`, `proxy`, `requestAll` HTTP client primitives backed by the manifest |

## HTTP API (OpenAPI)

| File | Audience |
|---|---|
| [openapi/fusecore-monitor.yaml](openapi/fusecore-monitor.yaml) | Monitoring / SRE integrators consuming the `Monitor.jsp` endpoints |

## Conventions

- Each `api/<module>.md` follows the same template: **Overview → Init Options → API**. Every documented function carries a signature, a parameters table, a return description, and at least one runnable code example. Functions critical to integration carry two examples covering different realistic use cases.
- All code examples are tested against the actual exported surface — if you find a drift, please open an issue.
- The OpenAPI spec is OpenAPI 3.1 compliant and lints clean under `@redocly/cli`.

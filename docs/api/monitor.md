# Monitor

Source: [`src/lib/monitor/`](../../src/lib/monitor/) · Spec: [openspec/specs/monitor/spec.md](../../openspec/specs/monitor/spec.md) · OpenAPI: [openapi/fusecore-monitor.yaml](../openapi/fusecore-monitor.yaml) · Back to [README](../../README.md#documentation)

## Overview

Records counters and average-value metrics keyed by HTTP path, samples process memory and CPU once per second, automatically tracks per-request latency / 404 / 5xx counts via Express middleware, and exposes metrics to a polling collector through a plaintext `Monitor.jsp` endpoint. **Cluster-aware**: the primary process owns the metric registry and serves `Monitor.jsp`; worker processes forward `recordCnt` / `recordVal` calls to the primary via IPC.

A snapshot of accumulated metrics is computed every **60 seconds**: counters are exported as their raw count, value-distribution metrics are exported as `sum / cnt` (the average per record), and both pools are then reset. The `Monitor.jsp` endpoint serves the most recently exported snapshot.

## Init Options

| Option | Type | Default | Description |
|---|---|---|---|
| `monitor.prefix` | string | `''` | Prepended (with an `_`) to every user-supplied metric code via `recordCnt`/`recordVal`. Empty string disables. |
| `monitor.suffix` | string | `''` | Appended (with an `_`) to every user-supplied metric code. Empty string disables. |
| `monitor.mem` | boolean | `true` | Sample process memory (RSS / heapUsed / heapTotal) once per second on the primary process. |
| `monitor.cpu` | boolean | `true` | Sample averaged CPU usage once per second on the primary process. |
| `monitor.req404` | boolean | `true` | Count 404 responses automatically when `common.expressApp` is set. |
| `monitor.req5xx` | boolean | `true` | Count 5xx responses automatically. |

Also relevant:

| Option | Description |
|---|---|
| `common.expressApp` | Required for the auto-request middleware and `Monitor.jsp` endpoints to be mounted. |
| `isPrimaryProcess` | Selects between the primary (owns metric registry, samples mem/cpu, serves `Monitor.jsp`) and worker (forwards records via IPC) implementation. |

## Auto-Monitoring Behavior

When `common.expressApp` is set, the monitor module installs a middleware that, for every request whose path does NOT match `healthcheck.html` or `Monitor.jsp`, records on response finish:

| Metric | Source |
|---|---|
| `all_req_Time` (value, ms) | response duration |
| `all_req_Count` (counter) | every monitored response |
| `404_req_Count` (counter) | only when `monitor.req404` is true AND (`res.statusCode === 404` OR `res.getHeader('X-Error') === '404'`) |
| `5xx_req_Count` (counter) | only when `monitor.req5xx` is true AND `res.statusCode` is in `[500, 599]` |

On the primary process, the following are sampled every 1 second (when enabled):

| Metric | Source |
|---|---|
| `mem_rss_usage_Value` (MB) | `process.memoryUsage().rss / 1024 / 1024` |
| `mem_heap_usage_Value` (MB) | `process.memoryUsage().heapUsed / 1024 / 1024` |
| `mem_heap_size_Value` (MB) | `process.memoryUsage().heapTotal / 1024 / 1024` |
| `cpu_usage_Value` | averaged CPU usage from the internal CPU sampler |

## API

### `monitor.recordCnt(code, path?, cnt?) → void`

Increment a counter named `<prefix>_<code>_<suffix>` under the given path.

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `code` | string | — | Metric code (will be wrapped by prefix/suffix). |
| `path` | string | `'/'` | Path bucket the metric belongs to. Free-form; collectors can scope by path. |
| `cnt` | number | `1` | Amount to add to the counter. |

### `monitor.recordCntBatch(obj, path?) → void`

Increment many counters in one call. Each own property of `obj` is treated as a `code → increment` pair, where the increment is `(obj[prop] * 1) || 1`.

### `monitor.recordVal(code, path?, val) → void`

Record a value-distribution sample. The exported metric is the **average** over the export window (`sum / cnt`). Useful for latencies, sizes, queue depths.

**Parameters**

| Name | Type | Default | Description |
|---|---|---|---|
| `code` | string | — | Metric code. |
| `path` | string | `'/'` | Path bucket. |
| `val` | number | — | Sample value. |

### `monitor.recordValBatch(obj, path?) → void`

Same iteration semantics as `recordCntBatch` — but **note**: in the current implementation this helper forwards to `recordCnt`, so each property is treated as a counter increment, not a value sample. Prefer explicit `recordVal` calls for value-distribution metrics until this is reconciled.

**Example 1 — recording a counter from a route handler**

```javascript
app.post('/orders', async (req, res) => {
    try {
        const order = await createOrder(req.body);
        FuseCore.monitor.recordCnt('order_created_Count', '/orders');
        FuseCore.monitor.recordVal('order_amount_Value', '/orders', order.amount);
        res.json(order);
    } catch (err) {
        FuseCore.monitor.recordCnt('order_failed_Count', '/orders');
        res.status(500).end();
    }
});
```

**Example 2 — polling `Monitor.jsp` with curl**

```bash
# Root-scoped metrics
curl -sS http://localhost:3000/Monitor.jsp

# Path-scoped metrics (e.g. just /orders)
curl -sS http://localhost:3000/orders/Monitor.jsp
```

Response (text/plain):

```
all_req_Count=1234
all_req_Time=18.7
404_req_Count=5
mem_rss_usage_Value=128.31
mem_heap_usage_Value=42.06
cpu_usage_Value=0.083
```

Each line is `<code>=<value>`. Counters export their raw count; value metrics export the average over the last 60-second window. See [openapi/fusecore-monitor.yaml](../openapi/fusecore-monitor.yaml) for the machine-readable endpoint contract.

### `monitor.getCurrentSummary(path) → string[]`

Synchronously return the latest exported snapshot for `path` as an array of `code=value` lines. Useful for in-process diagnostics or building a custom export endpoint.

```javascript
const lines = FuseCore.monitor.getCurrentSummary('/');
console.log(lines.join('\n'));
```

### `monitor.getCpuNum() → number`

Number of logical CPUs (`os.cpus().length`).

### `monitor.getCpuUsage() → number`

Current instantaneous CPU usage from the internal sampler (a value in `[0, 1]`). Returns `0` if `monitor.cpu` is disabled or CPU sampling has not run yet.

## HTTP Endpoints

When `common.expressApp` is set, two routes are mounted:

| Method | Path | Description |
|---|---|---|
| `GET` | `/Monitor.jsp` | Exported metric lines scoped to `'/'`. |
| `GET` | `/:path/Monitor.jsp` | Exported metric lines scoped to `:path`. |

Both routes respond with `200 OK`, `Content-Type: text/plain`, and cache-busting headers (`Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0`). Body is the metric lines joined by `\n`, with a trailing newline.

For a machine-readable contract see the [OpenAPI 3.1 spec](../openapi/fusecore-monitor.yaml).

## Cluster Behavior

- **Primary process**: owns the in-memory metric registry, runs the 60-second export interval, samples memory/CPU, and serves `Monitor.jsp`.
- **Worker processes**: `recordCnt`/`recordVal` calls are forwarded to the primary via Node IPC messages (channel `nestia_web.monitor.recordCnt` / `nestia_web.monitor.recordVal`). Workers do not run mem/cpu sampling and do not own the `Monitor.jsp` route handler — though the route is still mounted on each worker's Express app, because the primary forwards its `lastResult` back to workers so each worker can serve a consistent snapshot.

## Naming Conventions (recommended)

Metric names produced by FuseCore use a `_<unit>` suffix to make the export type self-describing:

- `*_Count` — integer counter (raw count exported).
- `*_Value` — value-distribution metric (average exported).

User-defined metrics are free to follow any convention; the framework does not enforce naming. Sticking with the same `_Count` / `_Value` convention makes collector dashboards easier to template.

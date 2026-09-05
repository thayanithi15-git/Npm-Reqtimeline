# reqtimeline

> A lightweight, zero-dependency Express.js request lifecycle and middleware timing profiler with Critical Path Bottleneck Detection, Performance Diagnosis Heuristics, Slow Request Fingerprinting, Request Timeline Trees, P50/P75/P95/P99 percentiles, and an Interactive CLI Dashboard.

`reqtimeline` helps backend developers understand **where time is spent during HTTP requests**. It provides sub-millisecond high-resolution timing, named middleware markers, slow step detection, nested request timeline trees, automated bottleneck identification, heuristic performance diagnosis, slow request fingerprinting, and global P50/P75/P95/P99 latency aggregation with real-time Performance Scoring.

---

## 📦 Version Map

| Version 1.0 | Version 1.1 & Advanced Diagnostic Features |
| :--- | :--- |
| ⏱ Request timing | 🏷 Status codes & Request IDs |
| 🔌 Middleware timing | 📈 P50 / P75 / P95 / P99 Percentiles |
| 🏷 Named steps (`timeline.mark`) | 🔎 Slow Request Fingerprinting |
| ⚠ Slow-step detection | 💯 Performance Score (0 - 100) |
| 🖥 Terminal box output | 🔥 Critical Path Bottleneck Detection |
| 📝 Structured JSON output | 🧠 Automatic Performance Diagnosis (Heuristics) |
| | 🌳 Request Timeline Tree |
| | 🌐 External API Timing (`timeExternal`) |
| | 🖥️ Interactive CLI Dashboard (`npx reqtimeline dashboard`) |

---

## 📁 Modular Domain Architecture

`reqtimeline` is organized into clean, domain-driven subfolders:

```text
src/
├── types/                # Strict TypeScript interfaces & contracts
├── core/                 # High-resolution timers & TimelineRecorder step tree stack
├── metrics/              # P50/P75/P95/P99 math, route fingerprinting & global aggregator
├── diagnostics/          # Critical path bottleneck identification & heuristic rules
├── formatting/           # ANSI terminal box drawing & structured JSON formatters
├── middleware/           # Express middleware factory & req.timeline binding
├── cli/                  # Interactive live CLI dashboard & executable binary
└── index.ts              # Main package entry point exporting all library utilities
```

---

## ⚡ Features

- ⚡ **Zero Runtime Dependencies** — Built with native Node.js high-resolution timers (`performance.now()`).
- 🔥 **Critical Path Bottleneck Detection** — Automatically pinpoints the primary operation causing slowness.
- 🧠 **Automatic Performance Diagnosis** — Generates pragmatic, heuristic optimization recommendations.
- 🌳 **Request Timeline Tree** — Visually maps nested controller, database, cache, and external API steps.
- 🔎 **Slow Request Fingerprinting** — Groups requests by route pattern (`GET /api/users`) to track request counts, average duration, P50/P75/P95/P99, and slow counts.
- 🌐 **External API Timing** — Dedicated `timeExternal` helper to profile third-party APIs (OpenAI, Stripe, GitHub, Google, microservices).
- 📈 **P50 / P75 / P95 / P99 Latency Metrics** — Percentile distributions to reveal latency outliers that simple averages hide.
- 💯 **Performance Score (0 - 100)** — Real-time performance score calculated from Apdex latency distributions and error rates.
- 🖥️ **Interactive CLI Dashboard** — Run `npx reqtimeline dashboard` for live route visualization with ASCII bar charts.
- 🆔 **Request IDs** — Automatic `x-request-id` header inspection or unique UUID generation.
- 🎨 **Beautiful Terminal Output** — Clean Unicode box format with optional ANSI color coding.
- 📝 **Structured JSON Output** — Easy integration with logging aggregators and APM tools.
- 🛡 **Non-Intrusive & Error Safe** — Zero interference with Express error handling and response streams.
- 🚀 **Production Bypass** — Complete zero-overhead opt-out for production environments (`enabled: false`).

---

## 🚀 Installation

```bash
npm install reqtimeline
```

---

## 🏁 Quick Start

```typescript
import express from "express";
import { timeline } from "reqtimeline";

const app = express();

// Enable reqtimeline middleware
app.use(timeline());

app.get("/api/dashboard", async (req, res) => {
  await req.timeline?.time("auth", () => new Promise((r) => setTimeout(r, 4)));
  await req.timeline?.time("validation", () => new Promise((r) => setTimeout(r, 2)));

  await req.timeline?.time("controller", async () => {
    await req.timeline?.time("database", () => new Promise((r) => setTimeout(r, 82)));
    await req.timeline?.time("cache", () => new Promise((r) => setTimeout(r, 3)));
    await req.timeline?.timeExternal("OpenAI API", () => new Promise((r) => setTimeout(r, 812)));
  });

  res.json({ status: "success" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

---

## 🌳 1. Request Timeline Tree & Terminal Output

When a request completes, `reqtimeline` outputs a formatted diagnostic tree report in your terminal:

```text
┌──────────────────────────────────────────────────────────┐
│ GET /api/dashboard 200 [req-8f4b12c9]                    │
├──────────────────────────────────────────────────────────┤
│ +0ms    request received       1ms ✓                     │
│ +4ms    auth                   4ms ✓                     │
│ +6ms    validation             2ms ✓                     │
│ +909ms  controller             903ms ✓                   │
│ +92ms   │ ├── database         82ms ✓                    │
│ +95ms   │ ├── cache            3ms ✓                     │
│ +907ms  │ └── 🌐 OpenAI API    🔴 BOTTLENECK 812ms       │
│ +909ms  response               0ms ✓                     │
├──────────────────────────────────────────────────────────┤
│ Total: 909ms (🔴 1 bottleneck)                           │
├──────────────────────────────────────────────────────────┤
│ ⚡ Bottleneck: 🌐 OpenAI API                             │
│    812ms (89% of request time)                           │
├──────────────────────────────────────────────────────────┤
│ ⚠ Performance Insight                                   │
│ 🌐 OpenAI API consumed 89% of the request.              │
│                                                          │
│ Recommendation:                                          │
│ Consider checking third-party service response latency,  │
│ response caching, or async background queuing.           │
└──────────────────────────────────────────────────────────┘
```

---

## 🔥 2. Critical Path Bottleneck Detection

Instead of forcing you to scan raw timing lists, `reqtimeline` automatically analyzes request execution:

1. **🔴 Primary Bottleneck**: Identifies the step consuming the largest percentage of total request time.
2. **Dedicated Callout Box**: Displays exact duration and percentage contribution to total latency.

---

## 🧠 3. Automatic Performance Diagnosis & Heuristic Rules

`reqtimeline` matches step names against pragmatic performance rules to recommend optimizations:

| Step Pattern | Category | Heuristic Recommendation |
| :--- | :--- | :--- |
| `database`, `prisma`, `mongoose`, `postgres`, `mongo`, `sql` | Database | *Consider checking database indexes, query complexity, or connection latency.* |
| `openai`, `stripe`, `github`, `external-api`, `fetch`, `http` | External API | *Consider checking third-party service response latency, response caching, or async background queuing.* |
| `auth`, `jwt`, `bcrypt`, `passport`, `login` | Authentication | *Consider caching verified tokens, tuning password hashing rounds, or optimizing session store lookups.* |
| `validation`, `zod`, `joi`, `schema` | Validation | *Consider pre-compiling validation schemas or deferring non-critical payload validation.* |
| `cache`, `redis`, `memcached` | Cache | *Consider optimizing cache hit ratio, key TTLs, or serialization performance.* |

---

## 🔎 4. Slow Request Fingerprinting

Group incoming requests by route pattern (`GET /api/users`) to spot performance degradation across endpoints:

```typescript
import { timeline } from "reqtimeline";

app.get("/api/metrics/fingerprints", (req, res) => {
  // Get route fingerprints sorted by slowest P95 duration
  const fingerprints = timeline.getFingerprints();
  res.json(fingerprints);
});
```

### Route Fingerprint Response

```json
[
  {
    "route": "GET /api/users",
    "method": "GET",
    "url": "/api/users",
    "count": 1284,
    "avgDuration": 82,
    "p50": 42,
    "p75": 71,
    "p95": 173,
    "p99": 421,
    "slowCount": 147
  }
]
```

---

## 📈 5. P50 / P75 / P95 / P99 Percentiles & Performance Score

Simple averages hide latency spikes. `reqtimeline` calculates complete percentile metrics and a normalized **Performance Score (0 - 100)**:

```typescript
const metrics = timeline.getMetrics();
console.log(`Score: ${metrics.performanceScore}/100`);
console.log(`P50: ${metrics.p50}ms | P75: ${metrics.p75}ms | P95: ${metrics.p95}ms | P99: ${metrics.p99}ms`);
```

---

## 🌐 6. External API Timing

Track third-party HTTP calls, microservices, and AI APIs with explicit visual badging:

```typescript
app.get("/api/analyze", async (req, res) => {
  await req.timeline?.time("controller", async () => {
    await req.timeline?.time("database", () => db.query());
    await req.timeline?.timeExternal("Stripe Payment API", () => stripe.charges.create());
    await req.timeline?.timeExternal("OpenAI API", () => openai.chat.completions.create());
  });
  res.json({ ok: true });
});
```

---

## 🖥️ 7. Interactive CLI Dashboard

Monitor your Express application's performance live directly from your terminal:

```bash
npx reqtimeline dashboard
```

Outputs an interactive dashboard with ASCII bar charts:

```text
┌────────────────────────────────────────────────────┐
│ reqtimeline live dashboard                         │
├────────────────────────────────────────────────────┤
│ Requests: 1,248                                    │
│ Avg:      67ms                                     │
│ P50:      42ms    P75:      71ms                   │
│ P95:      143ms    P99:      320ms                 │
├────────────────────────────────────────────────────┤
│ Slowest Routes                                     │
│                                                    │
│ GET /orders       241ms   ██████████████           │
│ GET /users        143ms   ████████                 │
│ POST /checkout    119ms   ██████                   │
└────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuration Reference

```typescript
app.use(
  timeline({
    enabled: process.env.NODE_ENV !== "production",
    slowThreshold: 50,         // Milliseconds threshold to flag steps as slow (Warning)
    criticalThreshold: 200,    // Milliseconds threshold to flag steps as critical (Severe)
    requestIdHeader: "x-request-id", // Request header name to inspect for Request ID
    generateRequestId: true,   // Auto-generate UUID request ID if header is missing
    enableTree: true,          // Enable nested request tree visualization
    enableInsights: true,      // Enable heuristic diagnostic insights
    aggregate: true,           // Track global P50/P75/P95/P99 latency metrics
    output: "terminal",        // "terminal" | "json" | "silent" | custom callback
    color: true,               // Enable ANSI colors in terminal output
    includeStatusCode: true,   // Show HTTP status code in output header
  })
);
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `process.env.NODE_ENV !== "production"` | Enables profiler. Set `false` in production for zero overhead. |
| `slowThreshold` | `number` | `50` | Milliseconds threshold to mark a step as slow (`⚠`). |
| `criticalThreshold` | `number` | `200` | Milliseconds threshold to mark a step as critical (`🚨`). |
| `requestIdHeader` | `string` | `"x-request-id"` | Incoming HTTP header name to inspect for Request ID. |
| `generateRequestId` | `boolean` | `true` | Auto-generate unique ID if header is absent. |
| `enableTree` | `boolean` | `true` | Render step timelines as nested trees. |
| `enableInsights` | `boolean` | `true` | Enable heuristic diagnostic recommendation engine. |
| `aggregate` | `boolean` | `true` | Track global request metrics and route fingerprints. |
| `output` | `"terminal" \| "json" \| "silent" \| Function` | `"terminal"` | Output target format or custom callback. |
| `color` | `boolean` | `true` (if TTY) | Enables ANSI color formatting. |
| `includeStatusCode` | `boolean` | `true` | Include response HTTP status code in top header. |

---

## 📘 API Reference

### `timeline(options?: TimelineOptions): RequestHandler`
Main Express middleware factory.

### `timeline.mark(name: string, middleware?: RequestHandler): RequestHandler`
Creates a named step marker or wraps an Express middleware function.

### `timeline.getMetrics(): TimelineMetrics`
Returns global aggregated request metrics (`totalRequests`, `p50`, `p75`, `p95`, `p99`, `avgDuration`, `errorRate`, `performanceScore`).

### `timeline.getFingerprints(): RouteFingerprint[]`
Returns route fingerprints sorted by slowest P95 duration.

### `timeline.getRouteStats(routeKey: string): RouteFingerprint | undefined`
Returns route fingerprint for a specific route (e.g. `"GET /api/users"`).

### `timeline.resetMetrics(): void`
Resets global metrics and route fingerprints.

### `req.timeline`
The active `TimelineRecorder` instance attached to the Express `Request` object.
- `req.timeline.mark(name: string)`: Start a named checkpoint step.
- `req.timeline.time(name: string, fn: () => Promise<T> | T)`: Profile an async or sync function (supports nested child steps).
- `req.timeline.timeExternal(serviceName: string, fn: () => Promise<T> | T)`: Profile an external API or microservice call.

---

## 📄 License

[MIT](LICENSE) © 2026 thayanithi15

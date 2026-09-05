# reqtimeline

> A lightweight, zero-dependency Express.js request lifecycle and middleware timing profiler with Critical Path Bottleneck Detection, Performance Heuristics, and Timeline Tree visualization.

`reqtimeline` helps developers understand **where time is spent during HTTP requests**. It provides sub-millisecond high-resolution timing, named middleware markers, slow step detection, nested request timeline trees, automated bottleneck identification, heuristic performance diagnosis, and global P50/P95/P99 latency aggregation with Performance Score.

---

## Features

- ⚡ **Zero Runtime Dependencies** — Pure Node.js high-resolution timers (`performance.now()`).
- 🔥 **Critical Path Detection** — Automatically pinpoints the primary bottleneck causing request slowness.
- 🧠 **Automatic Performance Diagnosis** — Generates pragmatic, heuristic optimization recommendations.
- 🌳 **Request Timeline Tree** — Visually maps nested controller, database, cache, and external API steps.
- 📊 **P50 / P95 / P99 Latency Metrics** — Aggregate metrics across requests with `timeline.getMetrics()`.
- 💯 **Performance Score** — Real-time performance score (0 - 100) based on Apdex latency distributions and error rates.
- 🆔 **Request IDs** — Automatic `x-request-id` header inspection or unique ID generation.
- 🎨 **Beautiful Terminal Output** — Clean Unicode box-drawing format with optional ANSI color coding.
- 📝 **Structured JSON Output** — Easy integration with logging aggregators and APM tools.
- 🛡 **Non-Intrusive & Error Safe** — Zero interference with Express error handling and response streams.
- 🚀 **Production Bypass** — Complete zero-overhead opt-out for production environments (`enabled: false`).
- 📘 **TypeScript-First** — Built in strict TypeScript with complete auto-completion and `.d.ts` declarations.

---

## Installation

```bash
npm install reqtimeline
```

---

## Quick Start

```typescript
import express from "express";
import { timeline } from "reqtimeline";

const app = express();

// Add reqtimeline middleware
app.use(timeline());

app.get("/api/orders", async (req, res) => {
  await req.timeline?.time("auth", () => new Promise(r => setTimeout(r, 3)));
  await req.timeline?.time("validation", () => new Promise(r => setTimeout(r, 2)));

  await req.timeline?.time("controller", async () => {
    await req.timeline?.time("database", () => new Promise(r => setTimeout(r, 184)));
    await req.timeline?.time("external-api", () => new Promise(r => setTimeout(r, 42)));
  });

  res.json({ status: "success" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

---

## 🌳 Request Timeline Tree & Terminal Output

When a request completes, `reqtimeline` outputs a formatted diagnostic tree report:

```text
┌──────────────────────────────────────────────────────────┐
│ GET /api/orders 200 [req-9f3a12b4]                       │
├──────────────────────────────────────────────────────────┤
│ +0ms    request received       1ms ✓                     │
│ +3ms    auth                   3ms ✓                     │
│ +5ms    validation             2ms ✓                     │
│ +231ms  controller             226ms ✓                   │
│ +189ms  │ ├── database         🔴 BOTTLENECK 184ms       │
│ +231ms  │ └── external-api     42ms ✓                    │
│ +231ms  response               0ms ✓                     │
├──────────────────────────────────────────────────────────┤
│ Total: 231ms (🔴 1 bottleneck)                           │
├──────────────────────────────────────────────────────────┤
│ ⚡ Bottleneck: database                                   │
│    184ms (79% of request time)                           │
├──────────────────────────────────────────────────────────┤
│ ⚠ Performance Insight                                   │
│ database consumed 79% of the request.                    │
│                                                          │
│ Recommendation:                                          │
│ Consider checking database indexes,                      │
│ query complexity, or connection latency.                 │
└──────────────────────────────────────────────────────────┘
```

---

## 🔥 Critical Path Detection & Performance Insights

Instead of forcing you to scan raw timing lists, `reqtimeline` automatically analyzes request execution:

1. **🔴 Primary Bottleneck**: Highlights the exact step causing slowness.
2. **🧠 Heuristic Recommendations**: Provides targeted optimization tips based on step patterns:
   - **Database**: Indexes, query complexity, connection pool latency.
   - **External APIs**: Service latency, connection pooling, response caching.
   - **Auth / Passwords**: Token caching, password hash cost factor (bcrypt rounds).
   - **Validation**: Pre-compiling schemas (Zod/Joi) or deferring non-critical validation.

---

## 📊 Aggregated Metrics & Performance Score (P50/P95/P99)

Track global request health metrics across requests:

```typescript
import { timeline } from "reqtimeline";

app.get("/api/health/metrics", (req, res) => {
  const metrics = timeline.getMetrics();
  res.json(metrics);
});
```

### Metrics Schema

```json
{
  "totalRequests": 1420,
  "p50": 18,
  "p95": 84,
  "p99": 195,
  "avgDuration": 32,
  "minDuration": 2,
  "maxDuration": 412,
  "errorRate": 0.002,
  "performanceScore": 94
}
```

---

## Configuration

Customize `reqtimeline` options:

```typescript
app.use(
  timeline({
    enabled: process.env.NODE_ENV !== "production",
    slowThreshold: 50,         // Flag steps taking >= 50ms as slow
    criticalThreshold: 200,    // Flag steps taking >= 200ms as critical
    requestIdHeader: "x-request-id", // Inspect header for request ID
    generateRequestId: true,   // Auto-generate UUID request ID if missing
    enableTree: true,          // Enable nested request tree structure
    enableInsights: true,      // Enable performance heuristic insights
    aggregate: true,           // Track P50/P95/P99 latency & performance score
    output: "terminal",        // "terminal" | "json" | "silent" | custom callback
    color: true,               // Enable ANSI terminal colors
    includeStatusCode: true,   // Show HTTP status code in header
  })
);
```

---

## Structured JSON Output

```typescript
app.use(timeline({ output: "json" }));
```

Example JSON response:

```json
{
  "requestId": "req-9f3a12b4",
  "method": "GET",
  "path": "/api/orders",
  "statusCode": 200,
  "duration": 231,
  "performanceScore": 92,
  "bottleneck": {
    "name": "database",
    "duration": 184,
    "percentage": 79
  },
  "insight": {
    "target": "database",
    "percentage": 79,
    "recommendation": "Consider checking database indexes, query complexity, or connection latency."
  },
  "steps": [
    {
      "name": "auth",
      "relativeTime": 3,
      "duration": 3,
      "slow": false,
      "status": "ok"
    },
    {
      "name": "controller",
      "relativeTime": 231,
      "duration": 226,
      "slow": true,
      "status": "slow",
      "children": [
        {
          "name": "database",
          "relativeTime": 189,
          "duration": 184,
          "slow": true,
          "critical": false,
          "isBottleneck": true,
          "status": "bottleneck"
        }
      ]
    }
  ]
}
```

---

## API Reference

### `timeline(options?: TimelineOptions): RequestHandler`
Main Express middleware factory.

### `timeline.mark(name: string, middleware?: RequestHandler): RequestHandler`
Creates a named step marker or wraps an Express middleware function.

### `timeline.getMetrics(): TimelineMetrics`
Returns aggregated P50, P95, P99, error rate, and Performance Score across all recorded requests.

### `timeline.resetMetrics(): void`
Resets the in-memory global metrics aggregator.

### `req.timeline`
The active `TimelineRecorder` instance attached to the Express `Request` object.
- `req.timeline.mark(name: string)`: Start a named checkpoint.
- `req.timeline.time(name: string, fn: () => Promise<T> | T)`: Profile an async or sync function (supports nested child steps).

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on [GitHub](https://github.com/thayanithi15-git/Npm-Reqtimeline).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Run tests and linting (`npm test && npm run typecheck`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## License

[MIT](LICENSE) © 2026 thayanithi15

# reqtimeline

> A lightweight, zero-dependency Express.js request lifecycle and middleware timing profiler.

`reqtimeline` helps developers understand **where time is being spent during an HTTP request**. It provides sub-millisecond high-resolution timing, named middleware markers, slow step detection, dynamic async step profiling, and beautiful terminal diagnostics.

---

## Features

- ⚡ **Zero Runtime Dependencies** — Pure Node.js high-resolution timers (`performance.now()`).
- 🎯 **Explicit Middleware Timing** — Name individual middleware steps cleanly with `timeline.mark("name")`.
- ⚠ **Slow Step Detection** — Configurable threshold (`slowThreshold`) to visually highlight bottleneck operations.
- 🎨 **Beautiful Terminal Output** — Clean Unicode box-drawing format with optional ANSI color coding.
- 📊 **Structured JSON Output** — Easy integration with logging and diagnostic systems.
- 🛡 **Non-Intrusive & Error Safe** — Zero interference with Express error handling and response streams.
- 🚀 **Production Bypass** — Complete zero-overhead opt-out for production environments (`enabled: false`).
- 📘 **TypeScript-First** — Built with strict TypeScript with complete auto-completion and `.d.ts` declarations.

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

app.get("/users", async (req, res) => {
  res.json({ users: ["Alice", "Bob"] });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

---

## Named Middleware

Explicitly name middleware steps to track exact durations:

```typescript
import express from "express";
import { timeline } from "reqtimeline";
import { authMiddleware } from "./auth";
import { validatePayload } from "./validation";

const app = express();

app.use(timeline());

// Option A: Standalone step checkpoints
app.use(timeline.mark("auth"), authMiddleware);
app.use(timeline.mark("validation"), validatePayload);

// Option B: Wrapper syntax
app.use(timeline.mark("database", async (req, res, next) => {
  await db.connect();
  next();
}));

// Option C: Dynamic inline async step timing
app.get("/api/data", async (req, res) => {
  const data = await req.timeline?.time("fetch-db", async () => {
    return await db.query("SELECT * FROM items");
  });
  res.json(data);
});
```

---

## Terminal Output

When a request completes, `reqtimeline` outputs a formatted diagnostic box in your terminal:

```text
┌──────────────────────────────────────────────┐
│ GET /api/users 200                           │
├──────────────────────────────────────────────┤
│ 0ms    request received                      │
│ 2ms    auth                 ✓                │
│ 3ms    validation           ✓                │
│ 18ms   controller           ✓                │
│ 72ms   database             ⚠ 54ms           │
│ 74ms   response             ✓                │
├──────────────────────────────────────────────┤
│ Total: 74ms                                  │
└──────────────────────────────────────────────┘
```

---

## Configuration

Customize `reqtimeline` options:

```typescript
app.use(
  timeline({
    enabled: process.env.NODE_ENV !== "production",
    slowThreshold: 50, // Flag steps taking >= 50ms as slow
    output: "terminal", // "terminal" | "json" | "silent" | custom callback
    color: true,        // Enable terminal colors
    includeStatusCode: true,
  })
);
```

### Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `process.env.NODE_ENV !== "production"` | Enables profiler. Set `false` in production for zero overhead. |
| `slowThreshold` | `number` | `50` | Milliseconds threshold to flag a step as slow (`⚠`). |
| `output` | `"terminal" \| "json" \| "silent" \| Function` | `"terminal"` | Output target format or custom summary callback. |
| `color` | `boolean` | `true` (if TTY) | Enables ANSI colors in terminal mode. |
| `includeStatusCode` | `boolean` | `true` | Include response HTTP status code in top header. |

---

## JSON Output

Switch to structured JSON output for log aggregators or programmatic analysis:

```typescript
app.use(
  timeline({
    output: "json",
  })
);
```

Example JSON output:

```json
{
  "method": "GET",
  "path": "/api/users",
  "statusCode": 200,
  "duration": 74,
  "steps": [
    {
      "name": "auth",
      "relativeTime": 2,
      "duration": 2,
      "slow": false
    },
    {
      "name": "validation",
      "relativeTime": 3,
      "duration": 1,
      "slow": false
    },
    {
      "name": "database",
      "relativeTime": 72,
      "duration": 54,
      "slow": true
    }
  ]
}
```

---

## Production Usage

`reqtimeline` is designed primarily as a development profiler. In production, disable it to bypass timing operations completely:

```typescript
app.use(
  timeline({
    enabled: process.env.NODE_ENV === "development",
  })
);
```

When `enabled: false`, `reqtimeline` immediately delegates to `next()` without creating timers or attaching state.

---

## API Reference

### `timeline(options?: TimelineOptions): RequestHandler`
Main Express middleware factory.

### `timeline.mark(name: string, middleware?: RequestHandler): RequestHandler`
Creates a named step marker or wraps an existing Express middleware function.

### `req.timeline`
The active `TimelineRecorder` instance attached to the Express `Request` object.
- `req.timeline.mark(name: string)`: Start a named checkpoint.
- `req.timeline.time(name: string, fn: () => Promise<T> | T)`: Profile an async or sync function.

---

## Roadmap

- [x] Express request lifecycle timing
- [x] Named middleware timing (`timeline.mark`)
- [x] Slow step detection thresholding
- [x] Terminal box formatting & ANSI color support
- [x] Structured JSON output mode
- [ ] CLI visualization tool (`npx reqtimeline`)
- [ ] Async operation instrumentation hooks
- [ ] Nested child step timelines
- [ ] Database client wrappers (Prisma / TypeORM / Knex)

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on [GitHub](https://github.com/thayanithi15-git/Npm-Reqtimeline).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Run tests and linting (`npm test && npm run lint`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## License

[MIT](LICENSE) © 2026 thayanithi15

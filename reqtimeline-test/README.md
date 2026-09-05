# reqtimeline-test

Integration test and demonstration server for the `reqtimeline` Express profiler package.

## Features Demonstrated

1. 🌳 **Request Timeline Tree**: Nested steps (`controller` -> `database` -> `cache` -> `OpenAI API`).
2. 🔥 **Critical Path Bottleneck Detection**: Automatic slowness identification on `/api/orders`.
3. 🧠 **Heuristic Performance Diagnosis**: Pragmatic optimization tips for DB & external APIs.
4. 🌐 **External API Timing**: `timeExternal("OpenAI API", ...)` profiling.
5. 🔎 **Slow Request Fingerprinting**: Route stats available at `/api/fingerprints`.
6. 📈 **P50 / P75 / P95 / P99 Metrics & Performance Score**: Global metrics at `/api/metrics`.

## Running the Demo

```bash
npm start
```

Then visit in your browser or terminal:
- `http://localhost:3000/api/dashboard`
- `http://localhost:3000/api/orders`
- `http://localhost:3000/api/metrics`
- `http://localhost:3000/api/fingerprints`

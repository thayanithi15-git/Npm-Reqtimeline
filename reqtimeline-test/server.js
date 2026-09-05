import express from "express";
import { timeline } from "reqtimeline";

const app = express();
app.use(express.json());

// Enable reqtimeline middleware
app.use(
  timeline({
    enabled: true,
    slowThreshold: 50,
    criticalThreshold: 200,
    aggregate: true,
    enableTree: true,
    enableInsights: true,
  })
);

// Named middleware markers
app.use(timeline.mark("auth"), (req, _res, next) => {
  req.user = { id: 1, role: "admin" };
  setTimeout(next, 5);
});

app.use(timeline.mark("validation"), (_req, _res, next) => {
  setTimeout(next, 2);
});

// 1. Route Timeline Tree & External API Timing
app.get("/api/dashboard", async (req, res) => {
  await req.timeline?.time("controller", async () => {
    await req.timeline?.time("database", () => new Promise((r) => setTimeout(r, 45)));
    await req.timeline?.time("cache", () => new Promise((r) => setTimeout(r, 3)));
    await req.timeline?.timeExternal("OpenAI API", () => new Promise((r) => setTimeout(r, 210)));
  });

  res.json({
    status: "success",
    data: { overview: "Dashboard analytics loaded successfully" },
  });
});

// 2. Critical Path Bottleneck Detection & DB Heuristics
app.get("/api/orders", async (req, res) => {
  await req.timeline?.time("controller", async () => {
    await req.timeline?.time("database-query-orders", () => new Promise((r) => setTimeout(r, 185)));
  });

  res.json({ status: "success", orders: [{ id: 101, amount: 250 }] });
});

// 3. Auth Performance Timing
app.post("/api/auth/login", async (req, res) => {
  await req.timeline?.time("bcrypt-hash-verify", () => new Promise((r) => setTimeout(r, 120)));
  res.json({ token: "sample-jwt-token" });
});

// 4. Global Percentile Metrics API (P50/P75/P95/P99 & Performance Score)
app.get("/api/metrics", (_req, res) => {
  const metrics = timeline.getMetrics();
  res.json(metrics);
});

// 5. Slow Request Fingerprinting API
app.get("/api/fingerprints", (_req, res) => {
  const fingerprints = timeline.getFingerprints();
  res.json(fingerprints);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 reqtimeline-test server running at http://localhost:${PORT}`);
  console.log(`   Try visiting:`);
  console.log(`   - http://localhost:${PORT}/api/dashboard`);
  console.log(`   - http://localhost:${PORT}/api/orders`);
  console.log(`   - http://localhost:${PORT}/api/metrics`);
  console.log(`   - http://localhost:${PORT}/api/fingerprints\n`);
});

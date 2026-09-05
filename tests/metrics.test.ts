import { describe, expect, it, beforeEach } from "vitest";
import { MetricsAggregator, TimelineRecorder, timeline } from "../src/index";

describe("Metrics, Percentiles, & Route Fingerprinting", () => {
  let aggregator: MetricsAggregator;

  beforeEach(() => {
    aggregator = new MetricsAggregator(100);
    timeline.resetMetrics();
  });

  it("should calculate correct P50, P75, P95, P99 percentiles and performance score", () => {
    for (let i = 1; i <= 10; i++) {
      aggregator.record("GET", "/test", i * 10, 200);
    }

    const metrics = aggregator.getMetrics();

    expect(metrics.totalRequests).toBe(10);
    expect(metrics.minDuration).toBe(10);
    expect(metrics.maxDuration).toBe(100);
    expect(metrics.avgDuration).toBe(55);
    expect(metrics.p50).toBe(50);
    expect(metrics.p75).toBe(80);
    expect(metrics.p95).toBe(100);
    expect(metrics.p99).toBe(100);
    expect(metrics.performanceScore).toBeGreaterThanOrEqual(90);
  });

  it("should group requests by route pattern for fingerprinting", async () => {
    for (let i = 1; i <= 5; i++) {
      const rec = new TimelineRecorder("GET", "/api/users", 50, 200);
      await rec.time("controller", () => new Promise((r) => setTimeout(r, i * 15)));
      rec.finish(200);
    }

    const recOrder = new TimelineRecorder("GET", "/api/orders", 50, 200);
    await recOrder.time("database", () => new Promise((r) => setTimeout(r, 120)));
    recOrder.finish(200);

    const fingerprints = timeline.getFingerprints();
    expect(fingerprints.length).toBe(2);

    const userFingerprint = timeline.getRouteStats("GET /api/users");
    expect(userFingerprint?.count).toBe(5);
    expect(userFingerprint?.p75).toBeGreaterThan(0);

    const orderFingerprint = timeline.getRouteStats("GET /api/orders");
    expect(orderFingerprint?.slowCount).toBe(1);
  });
});

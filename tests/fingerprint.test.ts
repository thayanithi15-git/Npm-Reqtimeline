import { describe, expect, it, beforeEach } from "vitest";
import { TimelineRecorder } from "../src/core/recorder";
import { timeline } from "../src/middleware/middleware";

describe("Slow Request Fingerprinting & Route Aggregation", () => {
  beforeEach(() => {
    timeline.resetMetrics();
  });

  it("should group requests by route pattern and calculate route percentiles", async () => {
    // Record multiple requests for /api/users
    for (let i = 1; i <= 5; i++) {
      const rec = new TimelineRecorder("GET", "/api/users", 50, 200);
      await rec.time("controller", () => new Promise((r) => setTimeout(r, i * 20)));
      rec.finish(200);
    }

    // Record requests for /api/orders
    const recOrder = new TimelineRecorder("GET", "/api/orders", 50, 200);
    await recOrder.time("database", () => new Promise((r) => setTimeout(r, 150)));
    recOrder.finish(200);

    const fingerprints = timeline.getFingerprints();

    expect(fingerprints.length).toBe(2);

    const userFingerprint = timeline.getRouteStats("GET /api/users");
    expect(userFingerprint).toBeDefined();
    expect(userFingerprint?.count).toBe(5);
    expect(userFingerprint?.p50).toBeGreaterThan(0);
    expect(userFingerprint?.p75).toBeGreaterThan(0);
    expect(userFingerprint?.p95).toBeGreaterThan(0);
    expect(userFingerprint?.p99).toBeGreaterThan(0);

    const orderFingerprint = timeline.getRouteStats("GET /api/orders");
    expect(orderFingerprint).toBeDefined();
    expect(orderFingerprint?.slowCount).toBe(1);
  });
});

import { describe, expect, it, beforeEach } from "vitest";
import { MetricsAggregator } from "../src/metrics";
import { timeline } from "../src/middleware";

describe("Request Aggregation, P50/P95/P99, & Performance Score", () => {
  let aggregator: MetricsAggregator;

  beforeEach(() => {
    aggregator = new MetricsAggregator(100);
    timeline.resetMetrics();
  });

  it("should calculate correct percentiles and min/max/avg durations", () => {
    // Record 10 requests with durations 10ms to 100ms
    for (let i = 1; i <= 10; i++) {
      aggregator.record(i * 10, 200);
    }

    const metrics = aggregator.getMetrics();

    expect(metrics.totalRequests).toBe(10);
    expect(metrics.minDuration).toBe(10);
    expect(metrics.maxDuration).toBe(100);
    expect(metrics.avgDuration).toBe(55);
    expect(metrics.p50).toBe(50);
    expect(metrics.p95).toBe(100);
    expect(metrics.p99).toBe(100);
    expect(metrics.errorRate).toBe(0);
    expect(metrics.performanceScore).toBeGreaterThanOrEqual(90);
  });

  it("should penalize performance score on high latencies and 5xx errors", () => {
    // Fast requests
    aggregator.record(30, 200);
    aggregator.record(40, 200);
    const goodMetrics = aggregator.getMetrics();

    // Slow and error-prone requests
    for (let i = 0; i < 5; i++) {
      aggregator.record(500, 500);
    }

    const badMetrics = aggregator.getMetrics();

    expect(badMetrics.errorRate).toBeGreaterThan(0);
    expect(badMetrics.performanceScore).toBeLessThan(goodMetrics.performanceScore);
  });

  it("should expose global metrics via middleware factory methods", () => {
    timeline.resetMetrics();
    const emptyMetrics = timeline.getMetrics();
    expect(emptyMetrics.totalRequests).toBe(0);

    const handler = timeline();
    expect(handler).toBeDefined();
    expect(typeof timeline.getMetrics).toBe("function");
    expect(typeof timeline.resetMetrics).toBe("function");
  });
});

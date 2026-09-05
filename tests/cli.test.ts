import { describe, expect, it } from "vitest";
import { renderDashboard, renderBarChart } from "../src/cli/dashboard";

describe("Interactive CLI Dashboard", () => {
  it("should render ASCII bar charts proportional to values", () => {
    const barsFull = renderBarChart(100, 100, 10);
    expect(barsFull).toBe("██████████");

    const barsHalf = renderBarChart(50, 100, 10);
    expect(barsHalf).toBe("█████");
  });

  it("should render live CLI dashboard layout with metrics and slowest routes", () => {
    const mockMetrics = {
      totalRequests: 1248,
      p50: 42,
      p75: 71,
      p95: 143,
      p99: 320,
      avgDuration: 67,
      minDuration: 5,
      maxDuration: 420,
      errorRate: 0.001,
      performanceScore: 94,
    };

    const mockFingerprints = [
      {
        route: "GET /orders",
        method: "GET",
        url: "/orders",
        count: 500,
        avgDuration: 120,
        p50: 80,
        p75: 120,
        p95: 241,
        p99: 400,
        slowCount: 45,
      },
    ];

    const output = renderDashboard(mockMetrics, mockFingerprints);

    expect(output).toContain("reqtimeline live dashboard");
    expect(output).toContain("Requests: 1,248");
    expect(output).toContain("P50:      42ms");
    expect(output).toContain("P75:      71ms");
    expect(output).toContain("GET /orders");
  });
});

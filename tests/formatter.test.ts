import { describe, it, expect } from "vitest";
import { formatTerminal, formatJson } from "../src/formatter";
import type { TimelineSummary } from "../src/types";

describe("reqtimeline - Output Formatters", () => {
  const mockSummary: TimelineSummary = {
    method: "GET",
    url: "/api/users",
    statusCode: 200,
    duration: 350,
    steps: [
      { name: "request received", relativeTime: 0, duration: 2, slow: false, status: "ok" },
      { name: "auth", relativeTime: 2, duration: 1, slow: false, status: "ok" },
      { name: "validation", relativeTime: 3, duration: 1, slow: false, status: "ok" },
      { name: "controller", relativeTime: 18, duration: 14, slow: false, status: "ok" },
      { name: "database", relativeTime: 72, duration: 54, slow: true, status: "slow" },
      { name: "external-api", relativeTime: 348, duration: 276, slow: true, critical: true, status: "critical" },
      { name: "response", relativeTime: 350, duration: 2, slow: false, status: "ok" },
    ],
  };

  it("should format terminal box output with slow and critical warning indicators", () => {
    const formatted = formatTerminal(mockSummary, { color: false, includeStatusCode: true });

    expect(formatted).toContain("GET /api/users 200");
    expect(formatted).toContain("request received");
    expect(formatted).toContain("auth");
    expect(formatted).toContain("database");
    expect(formatted).toContain("⚠ 54ms [SLOW]");
    expect(formatted).toContain("🚨 276ms [CRITICAL]");
    expect(formatted).toContain("Total: 350ms (🚨 1 critical, ⚠ 1 slow)");
    expect(formatted).toContain("┌");
    expect(formatted).toContain("└");
  });

  it("should format JSON output with status and critical flags", () => {
    const jsonStr = formatJson(mockSummary);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.method).toBe("GET");
    expect(parsed.path).toBe("/api/users");
    expect(parsed.statusCode).toBe(200);
    expect(parsed.duration).toBe(350);
    expect(parsed.steps).toHaveLength(7);
    expect(parsed.steps[4].name).toBe("database");
    expect(parsed.steps[4].slow).toBe(true);
    expect(parsed.steps[4].status).toBe("slow");
    expect(parsed.steps[5].name).toBe("external-api");
    expect(parsed.steps[5].critical).toBe(true);
    expect(parsed.steps[5].status).toBe("critical");
  });
});

import { describe, it, expect } from "vitest";
import { formatTerminal, formatJson } from "../src/formatter";
import type { TimelineSummary } from "../src/types";

describe("reqtimeline - Output Formatters", () => {
  const mockSummary: TimelineSummary = {
    method: "GET",
    url: "/api/users",
    statusCode: 200,
    duration: 74,
    steps: [
      { name: "request received", relativeTime: 0, duration: 2, slow: false },
      { name: "auth", relativeTime: 2, duration: 1, slow: false },
      { name: "validation", relativeTime: 3, duration: 1, slow: false },
      { name: "controller", relativeTime: 18, duration: 14, slow: false },
      { name: "database", relativeTime: 72, duration: 54, slow: true },
      { name: "response", relativeTime: 74, duration: 2, slow: false },
    ],
  };

  it("should format terminal box output correctly without color", () => {
    const formatted = formatTerminal(mockSummary, { color: false, includeStatusCode: true });

    expect(formatted).toContain("GET /api/users 200");
    expect(formatted).toContain("request received");
    expect(formatted).toContain("auth");
    expect(formatted).toContain("database");
    expect(formatted).toContain("⚠ 54ms");
    expect(formatted).toContain("Total: 74ms");
    expect(formatted).toContain("┌");
    expect(formatted).toContain("└");
  });

  it("should format JSON output correctly", () => {
    const jsonStr = formatJson(mockSummary);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.method).toBe("GET");
    expect(parsed.path).toBe("/api/users");
    expect(parsed.statusCode).toBe(200);
    expect(parsed.duration).toBe(74);
    expect(parsed.steps).toHaveLength(6);
    expect(parsed.steps[4].name).toBe("database");
    expect(parsed.steps[4].slow).toBe(true);
    expect(parsed.steps[4].duration).toBe(54);
  });
});

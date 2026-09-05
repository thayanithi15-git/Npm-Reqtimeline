import { describe, expect, it } from "vitest";
import { TimelineRecorder, formatTerminal, formatJson } from "../../src/index";
import type { TimelineStep } from "../../src/index";

describe("Request Timeline Tree & Nested Steps", () => {
  it("should record nested child steps within parent step", async () => {
    const recorder = new TimelineRecorder("GET", "/api/dashboard", 50, 200, "req-tree-123");

    await recorder.time("auth", () => new Promise((r) => setTimeout(r, 10)));
    await recorder.time("validation", () => new Promise((r) => setTimeout(r, 10)));

    await recorder.time("controller", async () => {
      await recorder.time("database", () => new Promise((r) => setTimeout(r, 80)));
      await recorder.time("cache", () => new Promise((r) => setTimeout(r, 5)));
      await recorder.time("external API", () => new Promise((r) => setTimeout(r, 40)));
    });

    const summary = recorder.finish(200);

    expect(summary.requestId).toBe("req-tree-123");

    const controllerStep = summary.steps.find((s) => s.name === "controller");
    expect(controllerStep).toBeDefined();
    expect(controllerStep?.children).toBeDefined();
    expect(controllerStep?.children?.length).toBe(3);

    expect(controllerStep?.children?.[0].name).toBe("database");
    expect(controllerStep?.children?.[0].level).toBe(1);
    expect(controllerStep?.children?.[1].name).toBe("cache");
    expect(controllerStep?.children?.[2].name).toBe("external API");
  });

  it("should format tree output correctly in terminal format", async () => {
    const recorder = new TimelineRecorder("GET", "/api/dashboard", 50, 200);

    await recorder.time("auth", () => new Promise((r) => setTimeout(r, 5)));
    await recorder.time("controller", async () => {
      await recorder.time("database", () => new Promise((r) => setTimeout(r, 70)));
      await recorder.time("cache", () => new Promise((r) => setTimeout(r, 5)));
    });

    const summary = recorder.finish(200);
    const output = formatTerminal(summary, { color: false });

    expect(output).toContain("GET /api/dashboard 200");
    expect(output).toContain("controller");
    expect(output).toContain("├── database");
    expect(output).toContain("└── cache");
  });

  it("should format tree output in JSON format with children array", async () => {
    const recorder = new TimelineRecorder("GET", "/api/dashboard", 50, 200);

    await recorder.time("controller", async () => {
      await recorder.time("database", () => new Promise((r) => setTimeout(r, 60)));
    });

    const summary = recorder.finish(200);
    const jsonStr = formatJson(summary);
    const parsed: { path: string; steps: TimelineStep[] } = JSON.parse(jsonStr);

    expect(parsed.path).toBe("/api/dashboard");
    const controllerStep = parsed.steps.find((s) => s.name === "controller");
    expect(controllerStep?.children?.[0].name).toBe("database");
  });
});

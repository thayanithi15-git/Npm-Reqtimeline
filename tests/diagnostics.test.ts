import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline, TimelineRecorder, analyzePerformance } from "../src/index";
import type { TimelineSummary } from "../src/index";

describe("Diagnostics & Heuristic Performance Analysis", () => {
  it("should flag slow steps exceeding slowThreshold", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(timeline({ enabled: true, slowThreshold: 30, output: outputSpy }));
    app.use(timeline.mark("fast-step", (_req, _res, next) => setTimeout(next, 5)));
    app.use(timeline.mark("slow-step", (_req, _res, next) => setTimeout(next, 45)));

    app.get("/test", (_req, res) => res.send("done"));
    await request(app).get("/test");

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0] as TimelineSummary;

    const fast = summary.steps.find((s) => s.name === "fast-step");
    const slow = summary.steps.find((s) => s.name === "slow-step");

    expect(fast?.slow).toBe(false);
    expect(slow?.slow).toBe(true);
  });

  it("should detect database primary bottleneck and generate heuristic recommendation", async () => {
    const recorder = new TimelineRecorder("GET", "/api/orders", 50, 200);

    await recorder.time("auth", () => new Promise((r) => setTimeout(r, 5)));
    await recorder.time("database", () => new Promise((r) => setTimeout(r, 220)));

    const summary = recorder.finish(200);

    expect(summary.bottleneck).toBeDefined();
    expect(summary.bottleneck?.name).toBe("database");
    expect(summary.bottleneck?.percentage).toBeGreaterThanOrEqual(70);

    expect(summary.insight).toBeDefined();
    expect(summary.insight?.recommendation).toContain("database indexes");
  });

  it("should provide appropriate external API recommendation when external call is slow", async () => {
    const recorder = new TimelineRecorder("POST", "/api/checkout", 50, 200);

    await recorder.time("auth", () => new Promise((r) => setTimeout(r, 5)));
    await recorder.timeExternal("OpenAI API", () => new Promise((r) => setTimeout(r, 230)));

    const summary = recorder.finish(200);

    const externalStep = summary.steps.find((s) => s.name.includes("OpenAI API"));
    expect(externalStep?.isExternal).toBe(true);
    expect(summary.bottleneck?.name).toContain("OpenAI API");
    expect(summary.insight?.recommendation).toContain("third-party service");
  });

  it("should provide validation recommendation when zod schema is slow", () => {
    const steps = [
      { name: "validation-zod-schema", relativeTime: 10, duration: 180, slow: true },
      { name: "response", relativeTime: 200, duration: 5, slow: false },
    ];

    const result = analyzePerformance(steps, 200, 50);
    expect(result.bottleneck?.name).toBe("validation-zod-schema");
    expect(result.insight?.recommendation).toContain("pre-compiling validation schemas");
  });
});

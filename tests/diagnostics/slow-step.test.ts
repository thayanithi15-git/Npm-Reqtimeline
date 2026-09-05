import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline } from "../../src/index";
import type { TimelineSummary } from "../../src/index";

describe("reqtimeline - Slow Step Detection", () => {
  it("should flag step as slow if duration exceeds slowThreshold", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        slowThreshold: 30,
        output: outputSpy,
      })
    );

    app.use(
      timeline.mark("fast-step", (_req, _res, next) => {
        setTimeout(next, 5);
      })
    );

    app.use(
      timeline.mark("slow-step", (_req, _res, next) => {
        setTimeout(next, 50);
      })
    );

    app.get("/slow", (_req, res) => {
      res.send("done");
    });

    await request(app).get("/slow");

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0] as TimelineSummary;

    const fast = summary.steps.find((s) => s.name === "fast-step");
    const slow = summary.steps.find((s) => s.name === "slow-step");

    expect(fast).toBeDefined();
    expect(fast!.slow).toBe(false);

    expect(slow).toBeDefined();
    expect(slow!.slow).toBe(true);
  });
});

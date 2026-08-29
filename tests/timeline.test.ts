import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline } from "../src/index";
import type { TimelineSummary } from "../src/types";

describe("reqtimeline - Basic Request Timing", () => {
  it("should record basic request lifecycle and call custom output collector", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    app.get("/test", (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app).get("/test");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(outputSpy).toHaveBeenCalledTimes(1);

    const summary: TimelineSummary = outputSpy.mock.calls[0][0];
    expect(summary.method).toBe("GET");
    expect(summary.url).toBe("/test");
    expect(summary.statusCode).toBe(200);
    expect(summary.duration).toBeGreaterThanOrEqual(0);
    expect(summary.steps.length).toBeGreaterThan(0);
    expect(summary.steps[0].name).toBe("request received");
  });
});

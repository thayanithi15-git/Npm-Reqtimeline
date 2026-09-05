import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline } from "../../src/index";
import type { TimelineSummary } from "../../src/index";

describe("reqtimeline - Express Behavior & Edge Cases", () => {
  it("should handle 404 responses correctly", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    app.get("/exists", (_req, res) => {
      res.send("ok");
    });

    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0] as TimelineSummary;
    expect(summary.statusCode).toBe(404);
  });

  it("should handle POST requests with json body", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(express.json());
    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    app.post("/items", (req, res) => {
      res.status(201).json({ id: 123, ...req.body });
    });

    const res = await request(app).post("/items").send({ name: "Widget" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 123, name: "Widget" });

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0] as TimelineSummary;
    expect(summary.method).toBe("POST");
    expect(summary.statusCode).toBe(201);
  });
});

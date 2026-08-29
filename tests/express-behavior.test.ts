import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline } from "../src/index";
import type { TimelineSummary } from "../src/types";

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

    const res = await request(app).get("/non-existent-route");
    expect(res.status).toBe(404);

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0];

    expect(summary.statusCode).toBe(404);
    expect(summary.url).toBe("/non-existent-route");
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

    app.post("/users", (req, res) => {
      res.status(201).json({ created: req.body.name });
    });

    const res = await request(app).post("/users").send({ name: "Alice" });
    expect(res.status).toBe(201);

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0];

    expect(summary.method).toBe("POST");
    expect(summary.statusCode).toBe(201);
  });
});

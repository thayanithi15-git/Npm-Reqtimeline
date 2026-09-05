import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline, TimelineRecorder, formatTerminal, formatJson } from "../src/index";
import type { TimelineSummary, TimelineStep } from "../src/index";

describe("Core Profiler & Express Lifecycle", () => {
  it("should record basic request lifecycle and dispatch summary", async () => {
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

    const summary: TimelineSummary = outputSpy.mock.calls[0][0] as TimelineSummary;
    expect(summary.method).toBe("GET");
    expect(summary.url).toBe("/test");
    expect(summary.statusCode).toBe(200);
    expect(summary.steps.length).toBeGreaterThan(0);
    expect(summary.steps[0].name).toBe("request received");
  });

  it("should support named middleware step markers and wrapped middleware", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    app.use(timeline.mark("auth"), (_req, _res, next) => {
      setTimeout(next, 10);
    });

    app.use(
      timeline.mark("database", (_req, _res, next) => {
        setTimeout(next, 15);
      })
    );

    app.get("/users", (_req, res) => {
      res.json([{ id: 1 }]);
    });

    await request(app).get("/users");

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0] as TimelineSummary;
    const stepNames = summary.steps.map((s) => s.name);
    expect(stepNames).toContain("auth");
    expect(stepNames).toContain("database");
  });

  it("should record nested tree child steps within parent step", async () => {
    const recorder = new TimelineRecorder("GET", "/api/dashboard", 50, 200, "req-tree-123");

    await recorder.time("auth", () => new Promise((r) => setTimeout(r, 5)));
    await recorder.time("controller", async () => {
      await recorder.time("database", () => new Promise((r) => setTimeout(r, 30)));
      await recorder.time("cache", () => new Promise((r) => setTimeout(r, 5)));
    });

    const summary = recorder.finish(200);

    expect(summary.requestId).toBe("req-tree-123");
    const controllerStep = summary.steps.find((s) => s.name === "controller");
    expect(controllerStep).toBeDefined();
    expect(controllerStep?.children?.length).toBe(2);
    expect(controllerStep?.children?.[0].name).toBe("database");

    const terminalOut = formatTerminal(summary, { color: false });
    expect(terminalOut).toContain("├── database");

    const jsonStr = formatJson(summary);
    const parsed: { steps: TimelineStep[] } = JSON.parse(jsonStr);
    expect(parsed.steps.find((s) => s.name === "controller")?.children).toBeDefined();
  });

  it("should handle Express 404s and POST JSON bodies cleanly", async () => {
    const outputSpy = vi.fn();
    const app = express();
    app.use(express.json());
    app.use(timeline({ enabled: true, output: outputSpy }));

    app.post("/items", (req, res) => {
      res.status(201).json({ id: 123, ...req.body });
    });

    const postRes = await request(app).post("/items").send({ name: "Widget" });
    expect(postRes.status).toBe(201);
    expect(postRes.body).toEqual({ id: 123, name: "Widget" });

    const notFoundRes = await request(app).get("/404");
    expect(notFoundRes.status).toBe(404);
  });

  it("should bypass timing when enabled: false and not interfere with errors", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(timeline({ enabled: false, output: outputSpy }));

    app.get("/disabled", (req, res) => {
      expect(req.timeline).toBeUndefined();
      res.send("disabled");
    });

    await request(app).get("/disabled");
    expect(outputSpy).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline } from "../src/index";
import type { TimelineSummary } from "../src/index";

describe("reqtimeline - Named Middleware and Dynamic Marking", () => {
  it("should record standalone named middleware steps", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    app.use(timeline.mark("auth"), (_req, _res, next) => {
      setTimeout(next, 20);
    });

    app.use(timeline.mark("validation"), (_req, _res, next) => {
      next();
    });

    app.get("/users", (_req, res) => {
      res.json([{ id: 1 }]);
    });

    await request(app).get("/users");

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0];

    const stepNames = summary.steps.map((s) => s.name);
    expect(stepNames).toContain("auth");
    expect(stepNames).toContain("validation");
  });

  it("should support wrapped middleware syntax timeline.mark('db', fn)", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    const dbMiddleware = (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
      setTimeout(next, 30);
    };

    app.use(timeline.mark("database", dbMiddleware));

    app.get("/data", (_req, res) => {
      res.json({ ok: true });
    });

    await request(app).get("/data");

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0];
    const dbStep = summary.steps.find((s) => s.name === "database");

    expect(dbStep).toBeDefined();
    expect(dbStep!.duration).toBeGreaterThanOrEqual(25);
  });

  it("should record dynamic req.timeline.time async operations", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    app.get("/async-op", async (req, res) => {
      const data = await req.timeline?.time("fetch-external-api", async () => {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return { external: true };
      });
      res.json(data);
    });

    const res = await request(app).get("/async-op");
    expect(res.body).toEqual({ external: true });

    expect(outputSpy).toHaveBeenCalledTimes(1);
    const summary: TimelineSummary = outputSpy.mock.calls[0][0];
    const apiStep = summary.steps.find((s) => s.name === "fetch-external-api");

    expect(apiStep).toBeDefined();
    expect(apiStep!.duration).toBeGreaterThanOrEqual(20);
  });
});

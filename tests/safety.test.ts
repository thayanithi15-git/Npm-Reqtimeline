import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { timeline } from "../src/index";

describe("reqtimeline - Safety & Disabled Mode", () => {
  it("should bypass timing work when enabled: false", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: false,
        output: outputSpy,
      })
    );

    app.get("/disabled", (req, res) => {
      expect(req.timeline).toBeUndefined();
      res.send("disabled");
    });

    const res = await request(app).get("/disabled");
    expect(res.status).toBe(200);
    expect(outputSpy).not.toHaveBeenCalled();
  });

  it("should not swallow or interfere with application errors", async () => {
    const outputSpy = vi.fn();
    const app = express();

    app.use(
      timeline({
        enabled: true,
        output: outputSpy,
      })
    );

    app.get("/error", () => {
      throw new Error("Application custom error");
    });

    // Custom express error handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    });

    const res = await request(app).get("/error");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Application custom error" });
    expect(outputSpy).toHaveBeenCalledTimes(1);
  });
});

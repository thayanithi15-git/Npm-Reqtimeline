import { describe, expect, it } from "vitest";
import { TimelineRecorder, analyzePerformance } from "../../src/index";

describe("Critical Path & Heuristic Performance Diagnosis", () => {
  it("should automatically detect primary bottleneck and provide database recommendations", async () => {
    const recorder = new TimelineRecorder("GET", "/api/orders", 50, 200);

    await recorder.time("auth", () => new Promise((resolve) => setTimeout(resolve, 10)));
    await recorder.time("validation", () => new Promise((resolve) => setTimeout(resolve, 10)));
    await recorder.time("database", () => new Promise((resolve) => setTimeout(resolve, 220)));
    await recorder.time("external-api", () => new Promise((resolve) => setTimeout(resolve, 40)));

    const summary = recorder.finish(200);

    expect(summary.bottleneck).toBeDefined();
    expect(summary.bottleneck?.name).toBe("database");
    expect(summary.bottleneck?.duration).toBeGreaterThanOrEqual(200);
    expect(summary.bottleneck?.percentage).toBeGreaterThanOrEqual(60);

    expect(summary.insight).toBeDefined();
    expect(summary.insight?.target).toBe("database");
    expect(summary.insight?.recommendation).toContain("database indexes");
  });

  it("should provide appropriate external API recommendation when external fetch is slow", async () => {
    const recorder = new TimelineRecorder("POST", "/api/checkout", 50, 200);

    await recorder.time("auth", () => new Promise((resolve) => setTimeout(resolve, 10)));
    await recorder.time("external-api-stripe", () => new Promise((resolve) => setTimeout(resolve, 250)));

    const summary = recorder.finish(200);

    expect(summary.bottleneck?.name).toBe("external-api-stripe");
    expect(summary.insight?.recommendation).toContain("third-party service");
  });

  it("should provide auth recommendation when bcrypt/jwt is slow", async () => {
    const recorder = new TimelineRecorder("POST", "/api/login", 50, 200);

    await recorder.time("auth-jwt-verify", () => new Promise((resolve) => setTimeout(resolve, 210)));

    const summary = recorder.finish(200);

    expect(summary.bottleneck?.name).toBe("auth-jwt-verify");
    expect(summary.insight?.recommendation).toContain("caching verified tokens");
  });

  it("should provide validation recommendation when zod schema validation is slow", () => {
    const steps = [
      { name: "validation-zod-schema", relativeTime: 10, duration: 180, slow: true },
      { name: "response", relativeTime: 200, duration: 5, slow: false },
    ];

    const result = analyzePerformance(steps, 200, 50);

    expect(result.bottleneck?.name).toBe("validation-zod-schema");
    expect(result.insight?.recommendation).toContain("pre-compiling validation schemas");
  });
});

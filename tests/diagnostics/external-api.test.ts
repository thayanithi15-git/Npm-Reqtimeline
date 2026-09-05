import { describe, expect, it } from "vitest";
import { TimelineRecorder } from "../../src/index";

describe("External API Timing & Categorization", () => {
  it("should mark external API steps with isExternal flag and prefix emoji", async () => {
    const recorder = new TimelineRecorder("GET", "/api/analyze", 50, 200);

    await recorder.time("controller", () => new Promise((r) => setTimeout(r, 5)));
    await recorder.timeExternal("OpenAI API", () => new Promise((r) => setTimeout(r, 220)));

    const summary = recorder.finish(200);

    const externalStep = summary.steps.find((s) => s.name.includes("OpenAI API"));
    expect(externalStep).toBeDefined();
    expect(externalStep?.isExternal).toBe(true);
    expect(externalStep?.name).toContain("🌐 OpenAI API");

    expect(summary.bottleneck?.name).toContain("OpenAI API");
    expect(summary.insight?.recommendation).toContain("third-party service");
  });
});

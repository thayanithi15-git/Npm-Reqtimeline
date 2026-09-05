import { formatJson } from "./json";
import { formatTerminal } from "./terminal";
import type { TimelineOptions, TimelineSummary } from "../types";

export function dispatchOutput(summary: TimelineSummary, options: TimelineOptions): void {
  try {
    const { output = "terminal", color, includeStatusCode = true } = options;

    if (typeof output === "function") {
      output(summary);
      return;
    }

    if (output === "silent") {
      return;
    }

    if (output === "json") {
      console.log(formatJson(summary));
      return;
    }

    if (output === "terminal") {
      const isColorEnabled = color ?? (process.stdout && process.stdout.isTTY);
      const terminalOutput = formatTerminal(summary, {
        color: isColorEnabled,
        includeStatusCode,
      });
      console.log(terminalOutput);
    }
  } catch (err) {
    console.error("[reqtimeline] Error rendering timeline output:", err);
  }
}

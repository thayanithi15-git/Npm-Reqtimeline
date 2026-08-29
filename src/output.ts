import { formatJson, formatTerminal } from "./formatter";
import type { TimelineOptions, TimelineSummary } from "./types";

/**
 * Dispatch diagnostic output based on configured options.
 * Wrapped safely in try/catch so output formatting never interrupts application execution.
 */
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
      // Print JSON string to console
      console.log(formatJson(summary));
      return;
    }

    if (output === "terminal") {
      // Auto-detect color support if color option is omitted
      const isColorEnabled = color ?? (process.stdout && process.stdout.isTTY);
      const terminalOutput = formatTerminal(summary, {
        color: isColorEnabled,
        includeStatusCode,
      });
      console.log(terminalOutput);
    }
  } catch (err) {
    // Fail safely without throwing
    console.error("[reqtimeline] Error rendering timeline output:", err);
  }
}

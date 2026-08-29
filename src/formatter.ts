import type { TimelineSummary } from "./types";

interface FormatterOptions {
  color?: boolean;
  includeStatusCode?: boolean;
}

/**
 * ANSI escape codes for terminal color formatting.
 */
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  boldCyan: "\x1b[1m\x1b[36m",
  boldGreen: "\x1b[1m\x1b[32m",
};

/**
 * Strip ANSI codes to accurately calculate string lengths for box padding.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Format a TimelineSummary into a terminal box diagnostic report.
 */
export function formatTerminal(
  summary: TimelineSummary,
  options: FormatterOptions = {}
): string {
  const useColor = options.color ?? true;
  const includeStatus = options.includeStatusCode ?? true;

  const c = useColor
    ? COLORS
    : {
        reset: "",
        bold: "",
        dim: "",
        gray: "",
        green: "",
        yellow: "",
        cyan: "",
        boldCyan: "",
        boldGreen: "",
      };

  // Header line construction
  let header = `${summary.method} ${summary.url}`;
  if (includeStatus && summary.statusCode !== undefined) {
    header += ` ${summary.statusCode}`;
  }

  // Pre-format step lines to determine required width
  const formattedSteps: { raw: string; display: string }[] = [];

  for (const step of summary.steps) {
    const timeStr = `${step.relativeTime}ms`;
    const nameStr = step.name;

    let symbolStr = `${c.green}✓${c.reset}`;
    if (step.slow) {
      symbolStr = `${c.yellow}⚠ ${step.duration}ms${c.reset}`;
    }

    const rawLine = `${timeStr}    ${nameStr}    ${step.slow ? `⚠ ${step.duration}ms` : "✓"}`;
    const displayLine = `${c.gray}${timeStr.padEnd(7)}${c.reset} ${nameStr.padEnd(20)} ${symbolStr}`;

    formattedSteps.push({
      raw: rawLine,
      display: displayLine,
    });
  }

  const footerRaw = `Total: ${summary.duration}ms`;
  const footerDisplay = `${c.boldCyan}Total: ${summary.duration}ms${c.reset}`;

  // Find inner content box width (minimum 46 characters)
  let maxContentWidth = Math.max(
    header.length,
    footerRaw.length,
    ...formattedSteps.map((s) => stripAnsi(s.raw).length),
    44
  );

  // Add padding space
  maxContentWidth += 2;

  const topBorder = `${c.gray}┌${"─".repeat(maxContentWidth)}┐${c.reset}`;
  const midBorder = `${c.gray}├${"─".repeat(maxContentWidth)}┤${c.reset}`;
  const botBorder = `${c.gray}└${"─".repeat(maxContentWidth)}┘${c.reset}`;

  const headerDisplay = `${c.bold}${header}${c.reset}`;
  const headerPadding = " ".repeat(Math.max(0, maxContentWidth - stripAnsi(header).length - 1));
  const headerRow = `${c.gray}│${c.reset} ${headerDisplay}${headerPadding}${c.gray}│${c.reset}`;

  const stepRows = formattedSteps.map((s) => {
    const rawLen = stripAnsi(s.raw).length;
    const padding = " ".repeat(Math.max(0, maxContentWidth - rawLen - 1));
    return `${c.gray}│${c.reset} ${s.display}${padding}${c.gray}│${c.reset}`;
  });

  const footerLen = stripAnsi(footerRaw).length;
  const footerPadding = " ".repeat(Math.max(0, maxContentWidth - footerLen - 1));
  const footerRow = `${c.gray}│${c.reset} ${footerDisplay}${footerPadding}${c.gray}│${c.reset}`;

  return [topBorder, headerRow, midBorder, ...stepRows, midBorder, footerRow, botBorder].join("\n");
}

/**
 * Format a TimelineSummary into structured JSON.
 */
export function formatJson(summary: TimelineSummary): string {
  const jsonOutput = {
    method: summary.method,
    path: summary.url,
    statusCode: summary.statusCode,
    duration: summary.duration,
    steps: summary.steps.map((step) => ({
      name: step.name,
      relativeTime: step.relativeTime,
      duration: step.duration,
      slow: step.slow,
    })),
  };

  return JSON.stringify(jsonOutput, null, 2);
}

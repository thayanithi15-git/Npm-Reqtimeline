import type { TimelineStep, TimelineSummary } from "./types";

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
  red: "\x1b[31m",
  boldRed: "\x1b[1m\x1b[31m",
  boldYellow: "\x1b[1m\x1b[33m",
  boldGreen: "\x1b[1m\x1b[32m",
  cyan: "\x1b[36m",
  boldCyan: "\x1b[1m\x1b[36m",
  magenta: "\x1b[35m",
};

/**
 * Strip ANSI codes to accurately calculate string lengths for box padding.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

interface FormattedLine {
  raw: string;
  display: string;
}

/**
 * Recursively format steps into tree branch lines with visual indentation.
 */
function buildTreeLines(
  steps: TimelineStep[],
  options: {
    color: boolean;
    c: typeof COLORS;
    prefix?: string;
  },
  counts: { slow: number; critical: number; bottleneck: number }
): FormattedLine[] {
  const lines: FormattedLine[] = [];
  const { c, prefix = "" } = options;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isLast = i === steps.length - 1;
    const hasChildren = step.children && step.children.length > 0;

    const branch = (step.level ?? 0) > 0 ? (isLast ? "└── " : "├── ") : "";
    const currentPrefix = prefix + branch;

    const relativeStr = `+${step.relativeTime}ms`;
    const isBottleneck = step.isBottleneck || step.status === "bottleneck";
    const isCritical = step.critical || step.status === "critical";
    const isSlow = step.slow || step.status === "slow" || isCritical;

    if (isBottleneck) {
      counts.bottleneck++;
    } else if (isCritical) {
      counts.critical++;
    } else if (isSlow) {
      counts.slow++;
    }

    let symbolStr = `${c.green}✓${c.reset}`;
    let rawSymbol = "✓";

    if (isBottleneck) {
      symbolStr = `${c.boldRed}🔴 BOTTLENECK ${step.duration}ms${c.reset}`;
      rawSymbol = `🔴 BOTTLENECK ${step.duration}ms`;
    } else if (isCritical) {
      symbolStr = `${c.boldRed}🚨 ${step.duration}ms [CRITICAL]${c.reset}`;
      rawSymbol = `🚨 ${step.duration}ms [CRITICAL]`;
    } else if (isSlow) {
      symbolStr = `${c.boldYellow}⚠ ${step.duration}ms [SLOW]${c.reset}`;
      rawSymbol = `⚠ ${step.duration}ms [SLOW]`;
    } else {
      symbolStr = `${c.green}${step.duration}ms ✓${c.reset}`;
      rawSymbol = `${step.duration}ms ✓`;
    }

    const rawLine = `${relativeStr}    ${currentPrefix}${step.name}    ${rawSymbol}`;
    const displayLine = `${c.gray}${relativeStr.padEnd(7)}${c.reset} ${currentPrefix}${step.name.padEnd(20)} ${symbolStr}`;

    lines.push({
      raw: rawLine,
      display: displayLine,
    });

    if (hasChildren && step.children) {
      const childPrefix = prefix + ((step.level ?? 0) > 0 ? (isLast ? "    " : "│   ") : "│   ");
      const childLines = buildTreeLines(
        step.children,
        { ...options, prefix: childPrefix },
        counts
      );
      lines.push(...childLines);
    }
  }

  return lines;
}

/**
 * Format a TimelineSummary into a rich terminal diagnostic report with Bottlenecks and Insights.
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
        red: "",
        boldRed: "",
        boldYellow: "",
        boldGreen: "",
        cyan: "",
        boldCyan: "",
        magenta: "",
      };

  // Header line construction
  let header = `${summary.method} ${summary.url}`;
  if (includeStatus && summary.statusCode !== undefined) {
    let statusColor = c.green;
    if (summary.statusCode >= 500) statusColor = c.boldRed;
    else if (summary.statusCode >= 400) statusColor = c.boldYellow;
    else if (summary.statusCode >= 300) statusColor = c.cyan;

    header += ` ${statusColor}${summary.statusCode}${c.reset}`;
  }
  if (summary.requestId) {
    header += ` ${c.gray}[${summary.requestId}]${c.reset}`;
  }

  const counts = { slow: 0, critical: 0, bottleneck: 0 };
  const formattedSteps = buildTreeLines(summary.steps, { color: useColor, c }, counts);

  // Footer construction with warning summary badges
  let footerWarningRaw = "";
  let footerWarningDisplay = "";

  if (counts.bottleneck > 0 || counts.critical > 0 || counts.slow > 0) {
    const warnings: string[] = [];
    const rawWarnings: string[] = [];

    if (counts.bottleneck > 0) {
      warnings.push(`${c.boldRed}🔴 1 bottleneck${c.reset}`);
      rawWarnings.push(`🔴 1 bottleneck`);
    }
    if (counts.critical > 0) {
      warnings.push(`${c.boldRed}🚨 ${counts.critical} critical${c.reset}`);
      rawWarnings.push(`🚨 ${counts.critical} critical`);
    }
    if (counts.slow > 0) {
      warnings.push(`${c.boldYellow}⚠ ${counts.slow} slow${c.reset}`);
      rawWarnings.push(`⚠ ${counts.slow} slow`);
    }

    footerWarningRaw = ` (${rawWarnings.join(", ")})`;
    footerWarningDisplay = ` (${warnings.join(", ")})`;
  }

  const footerRaw = `Total: ${summary.duration}ms${footerWarningRaw}`;
  const footerDisplay = `${c.boldCyan}Total: ${summary.duration}ms${c.reset}${footerWarningDisplay}`;

  // Bottleneck box section
  const bottleneckLines: FormattedLine[] = [];
  if (summary.bottleneck) {
    const titleRaw = `⚡ Bottleneck: ${summary.bottleneck.name}`;
    const titleDisplay = `${c.boldRed}⚡ Bottleneck: ${c.bold}${summary.bottleneck.name}${c.reset}`;
    const detailRaw = `   ${summary.bottleneck.duration}ms (${summary.bottleneck.percentage}% of request time)`;
    const detailDisplay = `   ${c.red}${summary.bottleneck.duration}ms (${summary.bottleneck.percentage}% of request time)${c.reset}`;

    bottleneckLines.push({ raw: titleRaw, display: titleDisplay });
    bottleneckLines.push({ raw: detailRaw, display: detailDisplay });
  }

  // Performance Insight section
  const insightLines: FormattedLine[] = [];
  if (summary.insight) {
    const headerRaw = `⚠ Performance Insight`;
    const headerDisplay = `${c.boldYellow}⚠ Performance Insight${c.reset}`;
    const descRaw = `${summary.insight.target} consumed ${summary.insight.percentage}% of the request.`;
    const descDisplay = `${c.yellow}${summary.insight.target}${c.reset} consumed ${c.bold}${summary.insight.percentage}%${c.reset} of the request.`;
    const recLabelRaw = `Recommendation:`;
    const recLabelDisplay = `${c.dim}Recommendation:${c.reset}`;
    const recTextRaw = `${summary.insight.recommendation}`;
    const recTextDisplay = `${c.cyan}${summary.insight.recommendation}${c.reset}`;

    insightLines.push({ raw: headerRaw, display: headerDisplay });
    insightLines.push({ raw: descRaw, display: descDisplay });
    insightLines.push({ raw: "", display: "" });
    insightLines.push({ raw: recLabelRaw, display: recLabelDisplay });
    insightLines.push({ raw: recTextRaw, display: recTextDisplay });
  }

  // Find inner content box width (minimum 50 characters)
  const allRaws = [
    stripAnsi(header),
    stripAnsi(footerRaw),
    ...formattedSteps.map((s) => stripAnsi(s.raw)),
    ...bottleneckLines.map((s) => stripAnsi(s.raw)),
    ...insightLines.map((s) => stripAnsi(s.raw)),
  ];

  let maxContentWidth = Math.max(50, ...allRaws.map((r) => r.length)) + 2;

  const topBorder = `${c.gray}┌${"─".repeat(maxContentWidth)}┐${c.reset}`;
  const midBorder = `${c.gray}├${"─".repeat(maxContentWidth)}┤${c.reset}`;
  const dividerBorder = `${c.gray}├${"━".repeat(maxContentWidth)}┤${c.reset}`;
  const botBorder = `${c.gray}└${"─".repeat(maxContentWidth)}┘${c.reset}`;

  const makeRow = (display: string, raw: string) => {
    const rawLen = stripAnsi(raw).length;
    const padding = " ".repeat(Math.max(0, maxContentWidth - rawLen - 1));
    return `${c.gray}│${c.reset} ${display}${padding}${c.gray}│${c.reset}`;
  };

  const headerDisplay = `${c.bold}${header}${c.reset}`;
  const headerRow = makeRow(headerDisplay, header);
  const stepRows = formattedSteps.map((s) => makeRow(s.display, s.raw));
  const footerRow = makeRow(footerDisplay, footerRaw);

  const outputRows = [topBorder, headerRow, midBorder, ...stepRows, midBorder, footerRow];

  if (bottleneckLines.length > 0) {
    outputRows.push(dividerBorder);
    bottleneckLines.forEach((l) => outputRows.push(makeRow(l.display, l.raw)));
  }

  if (insightLines.length > 0) {
    outputRows.push(dividerBorder);
    insightLines.forEach((l) => outputRows.push(makeRow(l.display, l.raw)));
  }

  outputRows.push(botBorder);

  return outputRows.join("\n");
}

/**
 * Format a TimelineSummary into structured JSON.
 */
export function formatJson(summary: TimelineSummary): string {
  const mapStep = (step: TimelineStep): any => {
    const isBottleneck = step.isBottleneck || step.status === "bottleneck";
    const isCritical = step.critical ?? step.duration >= 200;
    const isSlow = step.slow || isCritical;
    const status = isBottleneck
      ? "bottleneck"
      : isCritical
      ? "critical"
      : isSlow
      ? "slow"
      : "ok";

    return {
      name: step.name,
      relativeTime: step.relativeTime,
      duration: step.duration,
      slow: isSlow,
      critical: isCritical,
      isBottleneck,
      status,
      level: step.level ?? 0,
      children: step.children ? step.children.map(mapStep) : undefined,
    };
  };

  const jsonOutput = {
    requestId: summary.requestId,
    method: summary.method,
    path: summary.url,
    statusCode: summary.statusCode,
    duration: summary.duration,
    performanceScore: summary.performanceScore,
    bottleneck: summary.bottleneck,
    insight: summary.insight,
    steps: summary.steps.map(mapStep),
  };

  return JSON.stringify(jsonOutput, null, 2);
}

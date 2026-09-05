import type { TimelineMetrics, RouteFingerprint } from "../types";

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
};

export function renderBarChart(val: number, maxVal: number, maxBars = 16): string {
  if (maxVal <= 0 || val <= 0) return "";
  const count = Math.max(1, Math.round((val / maxVal) * maxBars));
  return "█".repeat(count);
}

export function renderDashboard(metrics: TimelineMetrics, fingerprints: RouteFingerprint[]): string {
  const lines: string[] = [];

  const boxWidth = 52;
  const topBorder = `${COLORS.gray}┌${"─".repeat(boxWidth)}┐${COLORS.reset}`;
  const midBorder = `${COLORS.gray}├${"─".repeat(boxWidth)}┤${COLORS.reset}`;
  const botBorder = `${COLORS.gray}└${"─".repeat(boxWidth)}┘${COLORS.reset}`;

  lines.push(topBorder);
  lines.push(`${COLORS.gray}│${COLORS.reset} ${COLORS.boldCyan}reqtimeline live dashboard${COLORS.reset}${" ".repeat(boxWidth - 26)}${COLORS.gray}│${COLORS.reset}`);
  lines.push(midBorder);

  const reqLine = `Requests: ${metrics.totalRequests.toLocaleString()}`;
  const avgLine = `Avg:      ${metrics.avgDuration}ms`;
  const p50Line = `P50:      ${metrics.p50}ms`;
  const p75Line = `P75:      ${metrics.p75}ms`;
  const p95Line = `P95:      ${metrics.p95}ms`;
  const p99Line = `P99:      ${metrics.p99}ms`;

  const makeRow = (str: string) => {
    const pad = " ".repeat(Math.max(0, boxWidth - str.length - 1));
    return `${COLORS.gray}│${COLORS.reset} ${str}${pad}${COLORS.gray}│${COLORS.reset}`;
  };

  lines.push(makeRow(reqLine));
  lines.push(makeRow(avgLine));
  lines.push(makeRow(`${p50Line}    ${p75Line}`));
  lines.push(makeRow(`${p95Line}    ${p99Line}`));
  lines.push(midBorder);
  lines.push(makeRow(`${COLORS.boldYellow}Slowest Routes${COLORS.reset}`));
  lines.push(makeRow(""));

  if (fingerprints.length === 0) {
    lines.push(makeRow(`${COLORS.gray}No routes recorded yet.${COLORS.reset}`));
  } else {
    const topRoutes = fingerprints.slice(0, 5);
    const maxP95 = Math.max(...topRoutes.map((f) => f.p95), 1);

    for (const f of topRoutes) {
      const bars = renderBarChart(f.p95, maxP95, 14);
      const routeStr = `${f.route.padEnd(16)} ${String(f.p95 + "ms").padEnd(7)} ${COLORS.boldRed}${bars}${COLORS.reset}`;
      const rawLen = `${f.route.padEnd(16)} ${String(f.p95 + "ms").padEnd(7)} ${bars}`.length;
      const pad = " ".repeat(Math.max(0, boxWidth - rawLen - 1));

      lines.push(`${COLORS.gray}│${COLORS.reset} ${routeStr}${pad}${COLORS.gray}│${COLORS.reset}`);
    }
  }

  lines.push(botBorder);
  return lines.join("\n");
}

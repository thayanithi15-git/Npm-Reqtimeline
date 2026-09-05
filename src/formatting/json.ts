import type { TimelineStep, TimelineSummary } from "../types";

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
      isExternal: step.isExternal,
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

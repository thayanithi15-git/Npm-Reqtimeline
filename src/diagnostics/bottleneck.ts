import type { TimelineBottleneck, TimelineInsight, TimelineStep } from "../types";
import { getHeuristicRecommendation } from "./heuristics";

interface DiagnosticResult {
  bottleneck?: TimelineBottleneck;
  insight?: TimelineInsight;
  annotatedSteps: TimelineStep[];
}

/**
 * Detect primary request bottleneck and generate heuristic performance insight.
 */
export function analyzePerformance(
  steps: TimelineStep[],
  totalDuration: number,
  slowThreshold = 50
): DiagnosticResult {
  if (steps.length === 0 || totalDuration <= 0) {
    return { annotatedSteps: steps };
  }

  // Filter out request received and response overhead steps
  const actionableSteps = steps.filter(
    (s) => s.name !== "request received" && s.name !== "response"
  );

  const candidates = actionableSteps.length > 0 ? actionableSteps : steps;

  let bottleneckStep: TimelineStep | null = null;
  let maxDuration = -1;

  for (const step of candidates) {
    if (step.duration > maxDuration) {
      maxDuration = step.duration;
      bottleneckStep = step;
    }
  }

  let bottleneck: TimelineBottleneck | undefined;
  let insight: TimelineInsight | undefined;

  if (bottleneckStep && (maxDuration >= slowThreshold || maxDuration / totalDuration >= 0.3)) {
    const percentage = Math.round((maxDuration / Math.max(1, totalDuration)) * 100);

    bottleneck = {
      name: bottleneckStep.name,
      duration: maxDuration,
      percentage,
    };

    const recommendation = getHeuristicRecommendation(bottleneckStep.name);

    insight = {
      target: bottleneckStep.name,
      percentage,
      recommendation,
    };
  }

  // Annotate steps with bottleneck flag
  const annotatedSteps = steps.map((step) => {
    const isBottleneck = bottleneck !== undefined && step.name === bottleneck.name;
    const status: "ok" | "slow" | "critical" | "bottleneck" = isBottleneck
      ? "bottleneck"
      : step.critical
      ? "critical"
      : step.slow
      ? "slow"
      : "ok";

    return {
      ...step,
      isBottleneck,
      status,
      children: step.children
        ? analyzePerformance(step.children, totalDuration, slowThreshold).annotatedSteps
        : undefined,
    };
  });

  return {
    bottleneck,
    insight,
    annotatedSteps,
  };
}

import { analyzePerformance } from "./diagnostics";
import { globalMetrics } from "./metrics";
import { getCurrentTimeMs } from "./timer";
import type { TimelineStep, TimelineSummary } from "./types";

interface InternalStep {
  name: string;
  absoluteStart: number;
  absoluteEnd: number | null;
  level: number;
  children: InternalStep[];
  parent: InternalStep | null;
}

export class TimelineRecorder {
  public readonly requestId?: string;
  public readonly method: string;
  public readonly url: string;
  public readonly slowThreshold: number;
  public readonly criticalThreshold: number;
  public readonly startTime: number;

  private rootSteps: InternalStep[] = [];
  private stepStack: InternalStep[] = [];
  private activeStep: InternalStep | null = null;
  private isFinished = false;

  constructor(
    method: string,
    url: string,
    slowThreshold = 50,
    criticalThreshold = 200,
    requestId?: string
  ) {
    this.method = method;
    this.url = url;
    this.slowThreshold = slowThreshold;
    this.criticalThreshold = Math.max(slowThreshold, criticalThreshold);
    this.startTime = getCurrentTimeMs();
    this.requestId = requestId;

    // Initial step
    this.mark("request received");
  }

  /**
   * Start a new checkpoint step at root level. Closes any active root checkpoint.
   */
  public mark(name: string): void {
    if (this.isFinished) return;

    const now = getCurrentTimeMs();
    if (this.activeStep && this.activeStep.parent === null) {
      this.activeStep.absoluteEnd = now;
    }

    const newStep: InternalStep = {
      name,
      absoluteStart: now,
      absoluteEnd: null,
      level: 0,
      children: [],
      parent: null,
    };

    this.rootSteps.push(newStep);
    this.activeStep = newStep;
  }

  /**
   * Close the currently active checkpoint step manually if open.
   */
  public endStep(): void {
    if (this.isFinished) return;

    if (this.activeStep && this.activeStep.absoluteEnd === null) {
      this.activeStep.absoluteEnd = getCurrentTimeMs();
      this.activeStep = this.activeStep.parent;
    }
  }

  /**
   * Execute a synchronous or asynchronous function and measure its specific duration.
   * Supports nested child steps automatically.
   */
  public async time<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    if (this.isFinished) {
      return await fn();
    }

    const parentStep = this.stepStack.length > 0 ? this.stepStack[this.stepStack.length - 1] : null;
    const level = parentStep ? parentStep.level + 1 : 0;
    const start = getCurrentTimeMs();

    const timedStep: InternalStep = {
      name,
      absoluteStart: start,
      absoluteEnd: null,
      level,
      children: [],
      parent: parentStep,
    };

    if (parentStep) {
      parentStep.children.push(timedStep);
    } else {
      // Close active root checkpoint if any
      if (this.activeStep && this.activeStep.parent === null && this.activeStep.absoluteEnd === null) {
        this.activeStep.absoluteEnd = start;
      }
      this.rootSteps.push(timedStep);
    }

    this.stepStack.push(timedStep);
    const previousActive = this.activeStep;
    this.activeStep = timedStep;

    try {
      const result = await fn();
      return result;
    } finally {
      const end = getCurrentTimeMs();
      timedStep.absoluteEnd = end;
      this.stepStack.pop();

      this.activeStep = previousActive;
      // If returning to root level after a timed block, ensure active parent is tracked properly
      if (this.stepStack.length === 0 && previousActive && previousActive.parent === null) {
        if (previousActive.absoluteEnd === null) {
          // Keep active
        }
      }
    }
  }

  /**
   * Complete the timeline recording, compute metrics, bottleneck detection, and summary.
   */
  public finish(statusCode?: number): TimelineSummary {
    if (this.isFinished) {
      return this.toSummary(statusCode);
    }

    const now = getCurrentTimeMs();
    this.isFinished = true;

    // Close any unclosed steps
    for (const step of this.stepStack) {
      if (step.absoluteEnd === null) {
        step.absoluteEnd = now;
      }
    }
    this.stepStack = [];

    if (this.activeStep && this.activeStep.absoluteEnd === null) {
      this.activeStep.absoluteEnd = now;
    }

    // Record response completion step
    const responseStep: InternalStep = {
      name: "response",
      absoluteStart: now,
      absoluteEnd: now,
      level: 0,
      children: [],
      parent: null,
    };
    this.rootSteps.push(responseStep);

    return this.toSummary(statusCode, now);
  }

  /**
   * Convert internal step records into user-facing TimelineSummary.
   */
  private toSummary(statusCode?: number, endTimeMs?: number): TimelineSummary {
    const totalEndTime = endTimeMs ?? getCurrentTimeMs();
    const totalDuration = Math.max(0, totalEndTime - this.startTime);

    const convertStep = (step: InternalStep): TimelineStep => {
      const stepEnd = step.absoluteEnd ?? totalEndTime;
      const duration = Math.max(0, stepEnd - step.absoluteStart);
      const relativeTime = Math.max(0, stepEnd - this.startTime);
      const slow = duration >= this.slowThreshold;
      const critical = duration >= this.criticalThreshold;
      const status: "ok" | "slow" | "critical" = critical ? "critical" : slow ? "slow" : "ok";

      const children =
        step.children.length > 0 ? step.children.map((c) => convertStep(c)) : undefined;

      return {
        name: step.name,
        relativeTime: Math.round(relativeTime),
        duration: Math.round(duration),
        slow,
        critical,
        status,
        level: step.level,
        children,
      };
    };

    const rawSteps = this.rootSteps.map((s) => convertStep(s));

    // Perform Bottleneck Detection and Heuristic Performance Diagnosis
    const { bottleneck, insight, annotatedSteps } = analyzePerformance(
      rawSteps,
      totalDuration,
      this.slowThreshold
    );

    // Record into metrics aggregator
    globalMetrics.record(totalDuration, statusCode);
    const metrics = globalMetrics.getMetrics();

    return {
      requestId: this.requestId,
      method: this.method,
      url: this.url,
      statusCode,
      duration: Math.round(totalDuration),
      steps: annotatedSteps,
      bottleneck,
      insight,
      performanceScore: metrics.performanceScore,
    };
  }
}

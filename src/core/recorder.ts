import { analyzePerformance } from "../diagnostics/bottleneck";
import { globalMetrics } from "../metrics/aggregator";
import { getCurrentTimeMs } from "./timer";
import type { TimelineStep, TimelineSummary } from "../types";

interface InternalStep {
  name: string;
  absoluteStart: number;
  absoluteEnd: number | null;
  level: number;
  isExternal: boolean;
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
   * Start a new checkpoint step at root level.
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
      isExternal: false,
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
   * Execute a synchronous or asynchronous function and measure its duration.
   * Supports nested child steps automatically.
   */
  public async time<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    return this.internalTime(name, false, fn);
  }

  /**
   * Dedicated helper to measure external API / third-party service calls (Stripe, OpenAI, GitHub, etc.).
   */
  public async timeExternal<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const formattedName = name.startsWith("🌐") ? name : `🌐 ${name}`;
    return this.internalTime(formattedName, true, fn);
  }

  private async internalTime<T>(
    name: string,
    isExternal: boolean,
    fn: () => T | Promise<T>
  ): Promise<T> {
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
      isExternal,
      children: [],
      parent: parentStep,
    };

    if (parentStep) {
      parentStep.children.push(timedStep);
    } else {
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
    }
  }

  /**
   * Complete the timeline recording and compute metrics, bottleneck analysis, and summary.
   */
  public finish(statusCode?: number): TimelineSummary {
    if (this.isFinished) {
      return this.toSummary(statusCode);
    }

    const now = getCurrentTimeMs();
    this.isFinished = true;

    for (const step of this.stepStack) {
      if (step.absoluteEnd === null) {
        step.absoluteEnd = now;
      }
    }
    this.stepStack = [];

    if (this.activeStep && this.activeStep.absoluteEnd === null) {
      this.activeStep.absoluteEnd = now;
    }

    const responseStep: InternalStep = {
      name: "response",
      absoluteStart: now,
      absoluteEnd: now,
      level: 0,
      isExternal: false,
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
        isExternal: step.isExternal,
        status,
        level: step.level,
        children,
      };
    };

    const rawSteps = this.rootSteps.map((s) => convertStep(s));

    const { bottleneck, insight, annotatedSteps } = analyzePerformance(
      rawSteps,
      totalDuration,
      this.slowThreshold
    );

    // Record into global metrics & route fingerprint store
    globalMetrics.record(
      this.method,
      this.url,
      totalDuration,
      statusCode,
      this.slowThreshold
    );
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

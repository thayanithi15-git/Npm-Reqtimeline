import { getCurrentTimeMs } from "./timer";
import type { TimelineStep, TimelineSummary } from "./types";

interface InternalStep {
  name: string;
  absoluteStart: number;
  absoluteEnd: number | null;
}

export class TimelineRecorder {
  public readonly method: string;
  public readonly url: string;
  public readonly slowThreshold: number;
  public readonly startTime: number;

  private steps: InternalStep[] = [];
  private activeStep: InternalStep | null = null;
  private isFinished = false;

  constructor(method: string, url: string, slowThreshold = 50) {
    this.method = method;
    this.url = url;
    this.slowThreshold = slowThreshold;
    this.startTime = getCurrentTimeMs();

    // Initial step
    this.mark("request received");
  }

  /**
   * Start a new checkpoint step. Closes any previously active checkpoint step.
   */
  public mark(name: string): void {
    if (this.isFinished) return;

    const now = getCurrentTimeMs();
    if (this.activeStep) {
      this.activeStep.absoluteEnd = now;
    }

    const newStep: InternalStep = {
      name,
      absoluteStart: now,
      absoluteEnd: null,
    };

    this.steps.push(newStep);
    this.activeStep = newStep;
  }

  /**
   * Close the currently active step manually if open.
   */
  public endStep(): void {
    if (this.isFinished) return;

    if (this.activeStep && this.activeStep.absoluteEnd === null) {
      this.activeStep.absoluteEnd = getCurrentTimeMs();
      this.activeStep = null;
    }
  }

  /**
   * Execute a synchronous or asynchronous function and measure its specific duration.
   */
  public async time<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    if (this.isFinished) {
      return await fn();
    }

    const previousActive = this.activeStep;
    if (previousActive && previousActive.absoluteEnd === null) {
      previousActive.absoluteEnd = getCurrentTimeMs();
    }

    const start = getCurrentTimeMs();
    const timedStep: InternalStep = {
      name,
      absoluteStart: start,
      absoluteEnd: null,
    };
    this.steps.push(timedStep);
    this.activeStep = timedStep;

    try {
      const result = await fn();
      return result;
    } finally {
      const end = getCurrentTimeMs();
      timedStep.absoluteEnd = end;
      this.activeStep = null;
      // Resume previous active step if it was open
      if (previousActive && !this.isFinished) {
        const resumeStep: InternalStep = {
          name: previousActive.name,
          absoluteStart: end,
          absoluteEnd: null,
        };
        this.steps.push(resumeStep);
        this.activeStep = resumeStep;
      }
    }
  }

  /**
   * Complete the timeline recording and compute final summary.
   */
  public finish(statusCode?: number): TimelineSummary {
    if (this.isFinished) {
      return this.toSummary(statusCode);
    }

    const now = getCurrentTimeMs();
    this.isFinished = true;

    if (this.activeStep && this.activeStep.absoluteEnd === null) {
      this.activeStep.absoluteEnd = now;
    }

    // Record response completion step
    const responseStep: InternalStep = {
      name: "response",
      absoluteStart: now,
      absoluteEnd: now,
    };
    this.steps.push(responseStep);

    return this.toSummary(statusCode, now);
  }

  /**
   * Convert internal step records into user-facing TimelineSummary.
   */
  private toSummary(statusCode?: number, endTimeMs?: number): TimelineSummary {
    const totalEndTime = endTimeMs ?? getCurrentTimeMs();
    const totalDuration = Math.max(0, totalEndTime - this.startTime);

    const formattedSteps: TimelineStep[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const stepEnd = step.absoluteEnd ?? totalEndTime;
      const duration = Math.max(0, stepEnd - step.absoluteStart);
      const relativeTime = Math.max(0, stepEnd - this.startTime);
      const slow = duration >= this.slowThreshold;

      formattedSteps.push({
        name: step.name,
        relativeTime: Math.round(relativeTime),
        duration: Math.round(duration),
        slow,
      });
    }

    return {
      method: this.method,
      url: this.url,
      statusCode,
      duration: Math.round(totalDuration),
      steps: formattedSteps,
    };
  }
}

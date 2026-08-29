import type { RequestHandler } from "express";

/**
 * Diagnostic step recorded during request lifecycle.
 */
export interface TimelineStep {
  /** Name of the step or middleware */
  name: string;
  /** Timestamp in milliseconds relative to request start */
  relativeTime: number;
  /** Duration of this specific step in milliseconds */
  duration: number;
  /** Flag indicating if duration exceeded slowThreshold */
  slow: boolean;
}

/**
 * Complete summary of a profiled request lifecycle.
 */
export interface TimelineSummary {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL / path */
  url: string;
  /** Response HTTP status code (if available) */
  statusCode?: number;
  /** Total request duration from start to response finish in milliseconds */
  duration: number;
  /** List of individual timed steps */
  steps: TimelineStep[];
}

/**
 * Output target options for reqtimeline profiler.
 */
export type TimelineOutputType =
  | "terminal"
  | "json"
  | "silent"
  | ((summary: TimelineSummary) => void);

/**
 * Configuration options for reqtimeline.
 */
export interface TimelineOptions {
  /**
   * Enable profiling.
   * @default process.env.NODE_ENV !== "production"
   */
  enabled?: boolean;

  /**
   * Duration threshold in milliseconds to mark a step as slow.
   * @default 50
   */
  slowThreshold?: number;

  /**
   * Output target for diagnostic output.
   * @default "terminal"
   */
  output?: TimelineOutputType;

  /**
   * Enable ANSI colors in terminal output.
   * @default true (if TTY supports it)
   */
  color?: boolean;

  /**
   * Include HTTP status code in output header.
   * @default true
   */
  includeStatusCode?: boolean;
}

/**
 * Timeline Middleware Factory interface with `.mark()` helper method attached.
 */
export interface TimelineMiddlewareFactory {
  (options?: TimelineOptions): RequestHandler;
  mark(name: string, middleware?: RequestHandler): RequestHandler;
}

declare global {
  namespace Express {
    interface Request {
      timeline?: import("./recorder").TimelineRecorder;
    }
  }
}

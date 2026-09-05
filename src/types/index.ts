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
  /** Flag indicating if duration exceeded criticalThreshold */
  critical?: boolean;
  /** Flag indicating if step is an external API / service call */
  isExternal?: boolean;
  /** Flag indicating if step is the primary bottleneck */
  isBottleneck?: boolean;
  /** Timing status category */
  status?: "ok" | "slow" | "critical" | "bottleneck";
  /** Nesting depth level in request tree */
  level?: number;
  /** Sub-steps nested inside this step */
  children?: TimelineStep[];
}

/**
 * Diagnostic bottleneck details for slow request root cause analysis.
 */
export interface TimelineBottleneck {
  /** Name of the step identified as primary bottleneck */
  name: string;
  /** Duration of bottleneck step in milliseconds */
  duration: number;
  /** Percentage of total request time consumed by bottleneck */
  percentage: number;
}

/**
 * Heuristic performance diagnostic insight.
 */
export interface TimelineInsight {
  /** Target step name */
  target: string;
  /** Percentage of total request time consumed */
  percentage: number;
  /** Practical optimization recommendation */
  recommendation: string;
}

/**
 * Complete summary of a profiled request lifecycle.
 */
export interface TimelineSummary {
  /** Unique Request ID */
  requestId?: string;
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
  /** Primary performance bottleneck analysis if slow */
  bottleneck?: TimelineBottleneck;
  /** Heuristic performance diagnostic recommendation */
  insight?: TimelineInsight;
  /** Performance score (0 - 100) */
  performanceScore?: number;
}

/**
 * Aggregated performance metrics across multiple requests.
 */
export interface TimelineMetrics {
  totalRequests: number;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errorRate: number;
  performanceScore: number;
}

/**
 * Route-specific aggregated performance metrics for slow request fingerprinting.
 */
export interface RouteFingerprint {
  route: string;
  method: string;
  url: string;
  count: number;
  avgDuration: number;
  p50: number;
  p75: number;
  p95: number;
  p99: number;
  slowCount: number;
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
   * Duration threshold in milliseconds to mark a step as slow (Warning).
   * @default 50
   */
  slowThreshold?: number;

  /**
   * Duration threshold in milliseconds to mark a step as critical (Severe).
   * @default 200
   */
  criticalThreshold?: number;

  /**
   * Header name to inspect for existing Request ID.
   * @default "x-request-id"
   */
  requestIdHeader?: string;

  /**
   * Automatically generate Request ID if header is not present.
   * @default true
   */
  generateRequestId?: boolean;

  /**
   * Enable Request Timeline Tree visualization.
   * @default true
   */
  enableTree?: boolean;

  /**
   * Enable heuristic performance insights.
   * @default true
   */
  enableInsights?: boolean;

  /**
   * Track global request latency metrics (P50, P75, P95, P99, Performance Score).
   * @default true
   */
  aggregate?: boolean;

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
 * Timeline Middleware Factory interface with helper methods.
 */
export interface TimelineMiddlewareFactory {
  (options?: TimelineOptions): RequestHandler;
  mark(name: string, middleware?: RequestHandler): RequestHandler;
  getMetrics(): TimelineMetrics;
  getFingerprints(): RouteFingerprint[];
  getRouteStats(routeKey: string): RouteFingerprint | undefined;
  resetMetrics(): void;
}

declare global {
  namespace Express {
    interface Request {
      timeline?: import("../core/recorder").TimelineRecorder;
      requestId?: string;
    }
  }
}

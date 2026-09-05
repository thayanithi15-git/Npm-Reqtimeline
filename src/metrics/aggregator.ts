import type { TimelineMetrics } from "../types";
import { FingerprintAggregator } from "./fingerprint";
import { calculatePercentiles } from "./percentiles";

interface RecordedRequest {
  duration: number;
  statusCode?: number;
  timestamp: number;
}

export class MetricsAggregator {
  private requests: RecordedRequest[] = [];
  private maxWindowSize: number;
  public readonly fingerprints: FingerprintAggregator;

  constructor(maxWindowSize = 1000) {
    this.maxWindowSize = maxWindowSize;
    this.fingerprints = new FingerprintAggregator();
  }

  /**
   * Record completed request duration, route, and status code.
   */
  public record(
    method: string,
    url: string,
    duration: number,
    statusCode?: number,
    slowThreshold = 50
  ): void {
    const isSlow = duration >= slowThreshold;

    if (this.requests.length >= this.maxWindowSize) {
      this.requests.shift();
    }
    this.requests.push({
      duration: Math.max(0, duration),
      statusCode,
      timestamp: Date.now(),
    });

    this.fingerprints.record(method, url, duration, isSlow);
  }

  /**
   * Calculate current aggregate performance metrics including P50/P75/P95/P99 and performance score.
   */
  public getMetrics(): TimelineMetrics {
    if (this.requests.length === 0) {
      return {
        totalRequests: 0,
        p50: 0,
        p75: 0,
        p95: 0,
        p99: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        errorRate: 0,
        performanceScore: 100,
      };
    }

    const durations = this.requests.map((r) => r.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, d) => acc + d, 0);

    const minDuration = sorted[0];
    const maxDuration = sorted[count - 1];
    const avgDuration = Math.round(sum / count);

    const { p50, p75, p95, p99 } = calculatePercentiles(sorted);

    const errorCount = this.requests.filter(
      (r) => r.statusCode !== undefined && r.statusCode >= 500
    ).length;
    const errorRate = Math.round((errorCount / count) * 1000) / 1000;

    const performanceScore = this.calculatePerformanceScore(p50, p75, p95, p99, errorRate);

    return {
      totalRequests: count,
      p50,
      p75,
      p95,
      p99,
      avgDuration,
      minDuration,
      maxDuration,
      errorRate,
      performanceScore,
    };
  }

  /**
   * Reset all recorded metrics and fingerprints.
   */
  public reset(): void {
    this.requests = [];
    this.fingerprints.reset();
  }

  /**
   * Calculate normalized Performance Score (0 - 100).
   */
  public calculatePerformanceScore(
    p50: number,
    p75: number,
    p95: number,
    p99: number,
    errorRate: number
  ): number {
    let latencyScore = 100;

    if (p50 > 50) latencyScore -= Math.min(25, (p50 - 50) * 0.15);
    if (p75 > 100) latencyScore -= Math.min(20, (p75 - 100) * 0.12);
    if (p95 > 150) latencyScore -= Math.min(25, (p95 - 150) * 0.1);
    if (p99 > 300) latencyScore -= Math.min(20, (p99 - 300) * 0.05);

    const errorPenalty = errorRate * 500;

    return Math.max(0, Math.min(100, Math.round(latencyScore - errorPenalty)));
  }
}

// Global singleton instance
export const globalMetrics = new MetricsAggregator();

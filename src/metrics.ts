import type { TimelineMetrics } from "./types";

interface RecordedRequest {
  duration: number;
  statusCode?: number;
  timestamp: number;
}

export class MetricsAggregator {
  private requests: RecordedRequest[] = [];
  private maxWindowSize: number;

  constructor(maxWindowSize = 1000) {
    this.maxWindowSize = maxWindowSize;
  }

  /**
   * Record completed request duration and status code into in-memory window.
   */
  public record(duration: number, statusCode?: number): void {
    if (this.requests.length >= this.maxWindowSize) {
      this.requests.shift();
    }
    this.requests.push({
      duration: Math.max(0, duration),
      statusCode,
      timestamp: Date.now(),
    });
  }

  /**
   * Calculate current aggregate performance metrics including P50/P95/P99 and performance score.
   */
  public getMetrics(): TimelineMetrics {
    if (this.requests.length === 0) {
      return {
        totalRequests: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        errorRate: 0,
        performanceScore: 100,
      };
    }

    const durations = this.requests.map((r) => r.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, d) => acc + d, 0);

    const minDuration = durations[0];
    const maxDuration = durations[count - 1];
    const avgDuration = Math.round(sum / count);

    const p50 = this.getPercentile(durations, 50);
    const p95 = this.getPercentile(durations, 95);
    const p99 = this.getPercentile(durations, 99);

    const errorCount = this.requests.filter(
      (r) => r.statusCode !== undefined && r.statusCode >= 500
    ).length;
    const errorRate = Math.round((errorCount / count) * 1000) / 1000;

    const performanceScore = this.calculatePerformanceScore(p50, p95, p99, errorRate);

    return {
      totalRequests: count,
      p50,
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
   * Reset all recorded metrics.
   */
  public reset(): void {
    this.requests = [];
  }

  /**
   * Compute standard percentile value from sorted numeric array.
   */
  private getPercentile(sortedDurations: number[], percentile: number): number {
    if (sortedDurations.length === 0) return 0;
    if (sortedDurations.length === 1) return sortedDurations[0];

    const index = Math.ceil((percentile / 100) * sortedDurations.length) - 1;
    const clampedIndex = Math.max(0, Math.min(sortedDurations.length - 1, index));
    return Math.round(sortedDurations[clampedIndex]);
  }

  /**
   * Calculate normalized Performance Score (0 - 100) based on Apdex latency tiers and error penalty.
   */
  public calculatePerformanceScore(
    p50: number,
    p95: number,
    p99: number,
    errorRate: number
  ): number {
    // Latency component score (100 is ideal <= 50ms P50, <= 150ms P95, <= 300ms P99)
    let latencyScore = 100;

    if (p50 > 50) latencyScore -= Math.min(30, (p50 - 50) * 0.15);
    if (p95 > 150) latencyScore -= Math.min(30, (p95 - 150) * 0.1);
    if (p99 > 300) latencyScore -= Math.min(20, (p99 - 300) * 0.05);

    // Error rate penalty (each 1% error rate reduces score by 5 points)
    const errorPenalty = errorRate * 500;

    const finalScore = Math.max(0, Math.min(100, Math.round(latencyScore - errorPenalty)));
    return finalScore;
  }
}

// Global metrics instance singleton
export const globalMetrics = new MetricsAggregator();

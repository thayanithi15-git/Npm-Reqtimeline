import type { RouteFingerprint } from "../types";
import { calculatePercentiles } from "./percentiles";

interface RouteRecord {
  method: string;
  url: string;
  durations: number[];
  slowCount: number;
}

export class FingerprintAggregator {
  private routes: Map<string, RouteRecord> = new Map();

  /**
   * Record a completed request into route fingerprint store.
   */
  public record(method: string, url: string, duration: number, isSlow: boolean): void {
    const routeKey = `${method.toUpperCase()} ${url}`;

    let record = this.routes.get(routeKey);
    if (!record) {
      record = {
        method: method.toUpperCase(),
        url,
        durations: [],
        slowCount: 0,
      };
      this.routes.set(routeKey, record);
    }

    if (record.durations.length >= 500) {
      record.durations.shift();
    }

    record.durations.push(Math.max(0, duration));
    if (isSlow) {
      record.slowCount++;
    }
  }

  /**
   * Get all route fingerprints sorted by slowest P95 duration.
   */
  public getFingerprints(): RouteFingerprint[] {
    const results: RouteFingerprint[] = [];

    for (const [routeKey, record] of this.routes.entries()) {
      if (record.durations.length === 0) continue;

      const sum = record.durations.reduce((acc, d) => acc + d, 0);
      const avgDuration = Math.round(sum / record.durations.length);
      const { p50, p75, p95, p99 } = calculatePercentiles(record.durations);

      results.push({
        route: routeKey,
        method: record.method,
        url: record.url,
        count: record.durations.length,
        avgDuration,
        p50,
        p75,
        p95,
        p99,
        slowCount: record.slowCount,
      });
    }

    // Sort by slowest P95 descending
    return results.sort((a, b) => b.p95 - a.p95);
  }

  /**
   * Get fingerprint for a specific route.
   */
  public getRouteStats(routeKey: string): RouteFingerprint | undefined {
    return this.getFingerprints().find(
      (f) => f.route.toLowerCase() === routeKey.trim().toLowerCase()
    );
  }

  /**
   * Reset recorded fingerprints.
   */
  public reset(): void {
    this.routes.clear();
  }
}

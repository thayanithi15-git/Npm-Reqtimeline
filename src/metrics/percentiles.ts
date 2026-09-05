/**
 * Compute percentile value (0 - 100) from a pre-sorted array of numbers.
 */
export function getPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return Math.round(sortedValues[0]);

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  const clampedIndex = Math.max(0, Math.min(sortedValues.length - 1, index));
  return Math.round(sortedValues[clampedIndex]);
}

/**
 * Compute P50, P75, P95, P99 percentiles for a list of duration numbers.
 */
export function calculatePercentiles(durations: number[]): {
  p50: number;
  p75: number;
  p95: number;
  p99: number;
} {
  if (durations.length === 0) {
    return { p50: 0, p75: 0, p95: 0, p99: 0 };
  }

  const sorted = [...durations].sort((a, b) => a - b);

  return {
    p50: getPercentile(sorted, 50),
    p75: getPercentile(sorted, 75),
    p95: getPercentile(sorted, 95),
    p99: getPercentile(sorted, 99),
  };
}

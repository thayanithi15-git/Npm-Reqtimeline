/**
 * Get high-resolution current time in milliseconds.
 */
export function getCurrentTimeMs(): number {
  return performance.now();
}

/**
 * Format duration in milliseconds to a clean integer or single decimal string.
 */
export function formatMs(ms: number): string {
  const rounded = Math.round(ms);
  return `${rounded}ms`;
}

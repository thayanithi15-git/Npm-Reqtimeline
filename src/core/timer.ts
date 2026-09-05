/**
 * Return current timestamp in milliseconds using high-resolution performance.now().
 */
export function getCurrentTimeMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

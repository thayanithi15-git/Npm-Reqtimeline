import { timeline } from "./middleware/middleware";
export { timeline };
export default timeline;

export { TimelineRecorder } from "./core/recorder";
export { getCurrentTimeMs } from "./core/timer";

export { MetricsAggregator, globalMetrics } from "./metrics/aggregator";
export { FingerprintAggregator } from "./metrics/fingerprint";
export { calculatePercentiles, getPercentile } from "./metrics/percentiles";

export { analyzePerformance } from "./diagnostics/bottleneck";
export { HEURISTIC_PATTERNS, getHeuristicRecommendation } from "./diagnostics/heuristics";

export { formatTerminal, formatFingerprintsTerminal } from "./formatting/terminal";
export { formatJson } from "./formatting/json";
export { dispatchOutput } from "./formatting/output";

export type {
  TimelineOptions,
  TimelineStep,
  TimelineSummary,
  TimelineBottleneck,
  TimelineInsight,
  TimelineMetrics,
  RouteFingerprint,
  TimelineOutputType,
  TimelineMiddlewareFactory,
} from "./types";

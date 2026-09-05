import type { TimelineBottleneck, TimelineInsight, TimelineStep } from "./types";

interface DiagnosticResult {
  bottleneck?: TimelineBottleneck;
  insight?: TimelineInsight;
  annotatedSteps: TimelineStep[];
}

/**
 * Heuristic rules mapping step keywords to practical optimization recommendations.
 */
const HEURISTIC_PATTERNS: Array<{
  pattern: RegExp;
  category: string;
  recommendation: string;
}> = [
  {
    pattern: /(database|db|prisma|mongoose|sequelize|knex|typeorm|postgres|pg|mysql|mongo|redis|query|sql)/i,
    category: "database",
    recommendation:
      "Consider checking database indexes, query complexity, or connection latency.",
  },
  {
    pattern: /(external|api|fetch|axios|http|https|remote|third-party|gRPC|rest)/i,
    category: "external API",
    recommendation:
      "Consider checking third-party service response time, enabling HTTP keep-alive, or caching external responses.",
  },
  {
    pattern: /(auth|jwt|bcrypt|argon2|passport|session|login|token|permission)/i,
    category: "authentication",
    recommendation:
      "Consider caching verified tokens, tuning password hashing rounds, or optimizing session store lookups.",
  },
  {
    pattern: /(validation|validate|zod|joi|yup|schema|sanitiz)/i,
    category: "validation",
    recommendation:
      "Consider pre-compiling validation schemas or deferring non-critical payload validation.",
  },
  {
    pattern: /(cache|redis|memcached|store)/i,
    category: "cache",
    recommendation:
      "Consider optimizing cache hit ratio, key TTLs, or serialization performance.",
  },
  {
    pattern: /(render|template|view|ejs|pug|handlebars|html)/i,
    category: "rendering",
    recommendation:
      "Consider pre-rendering dynamic components, enabling response compression, or caching template output.",
  },
];

/**
 * Detect primary request bottleneck and generate heuristic performance insight.
 */
export function analyzePerformance(
  steps: TimelineStep[],
  totalDuration: number,
  slowThreshold = 50
): DiagnosticResult {
  if (steps.length === 0 || totalDuration <= 0) {
    return { annotatedSteps: steps };
  }

  // Filter out whole-request overhead steps if specific sub-steps exist
  const actionableSteps = steps.filter(
    (s) => s.name !== "request received" && s.name !== "response"
  );

  const candidates = actionableSteps.length > 0 ? actionableSteps : steps;

  // Find step with max duration
  let bottleneckStep: TimelineStep | null = null;
  let maxDuration = -1;

  for (const step of candidates) {
    if (step.duration > maxDuration) {
      maxDuration = step.duration;
      bottleneckStep = step;
    }
  }

  let bottleneck: TimelineBottleneck | undefined;
  let insight: TimelineInsight | undefined;

  if (bottleneckStep && (maxDuration >= slowThreshold || maxDuration / totalDuration >= 0.3)) {
    const percentage = Math.round((maxDuration / Math.max(1, totalDuration)) * 100);

    bottleneck = {
      name: bottleneckStep.name,
      duration: maxDuration,
      percentage,
    };

    // Find heuristic recommendation based on step name
    let recommendation = `Consider auditing synchronous execution bottlenecks or I/O latency in step "${bottleneckStep.name}".`;

    for (const rule of HEURISTIC_PATTERNS) {
      if (rule.pattern.test(bottleneckStep.name)) {
        recommendation = rule.recommendation;
        break;
      }
    }

    insight = {
      target: bottleneckStep.name,
      percentage,
      recommendation,
    };
  }

  // Annotate steps with bottleneck flag
  const annotatedSteps = steps.map((step) => {
    const isBottleneck = bottleneck !== undefined && step.name === bottleneck.name;
    const status: "ok" | "slow" | "critical" | "bottleneck" = isBottleneck
      ? "bottleneck"
      : step.critical
      ? "critical"
      : step.slow
      ? "slow"
      : "ok";

    return {
      ...step,
      isBottleneck,
      status,
      children: step.children
        ? analyzePerformance(step.children, totalDuration, slowThreshold).annotatedSteps
        : undefined,
    };
  });

  return {
    bottleneck,
    insight,
    annotatedSteps,
  };
}

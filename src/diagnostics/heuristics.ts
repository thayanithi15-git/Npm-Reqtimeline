export interface HeuristicRule {
  pattern: RegExp;
  category: string;
  recommendation: string;
}

export const HEURISTIC_PATTERNS: HeuristicRule[] = [
  {
    pattern: /(database|db|prisma|mongoose|sequelize|knex|typeorm|postgres|pg|mysql|mongo|redis|query|sql)/i,
    category: "database",
    recommendation:
      "Consider checking database indexes, query complexity, or connection latency.",
  },
  {
    pattern: /(openai|stripe|github|google|aws|azure|segment|sendgrid|twilio|external|api|fetch|axios|http|https|remote|third-party|grpc|rest|microservice)/i,
    category: "external API",
    recommendation:
      "Consider checking third-party service response latency, response caching, or async background queuing.",
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

export function getHeuristicRecommendation(stepName: string): string {
  for (const rule of HEURISTIC_PATTERNS) {
    if (rule.pattern.test(stepName)) {
      return rule.recommendation;
    }
  }
  return `Consider auditing synchronous execution bottlenecks or I/O latency in step "${stepName}".`;
}

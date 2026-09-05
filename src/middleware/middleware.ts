import type { Request, Response, NextFunction, RequestHandler } from "express";
import { TimelineRecorder } from "../core/recorder";
import { dispatchOutput } from "../formatting/output";
import { globalMetrics } from "../metrics/aggregator";
import type { TimelineOptions, TimelineMiddlewareFactory, TimelineMetrics, RouteFingerprint } from "../types";
import { randomBytes } from "crypto";

function generateRequestId(): string {
  return "req-" + randomBytes(4).toString("hex");
}

export const timeline: TimelineMiddlewareFactory = function (
  options: TimelineOptions = {}
): RequestHandler {
  const isEnabled =
    options.enabled ?? (process.env.NODE_ENV !== "production");
  const slowThreshold = options.slowThreshold ?? 50;
  const criticalThreshold = options.criticalThreshold ?? 200;
  const requestIdHeader = (options.requestIdHeader ?? "x-request-id").toLowerCase();
  const shouldGenerateRequestId = options.generateRequestId ?? true;

  const middlewareHandler: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    if (!isEnabled) {
      next();
      return;
    }

    try {
      const url = req.originalUrl || req.url || "/";

      let reqId: string | undefined = undefined;
      const headerVal = req.headers[requestIdHeader];

      if (typeof headerVal === "string" && headerVal.trim().length > 0) {
        reqId = headerVal.trim();
      } else if (Array.isArray(headerVal) && headerVal.length > 0) {
        reqId = headerVal[0].trim();
      } else if (shouldGenerateRequestId) {
        reqId = generateRequestId();
      }

      if (reqId) {
        req.requestId = reqId;
      }

      const recorder = new TimelineRecorder(
        req.method,
        url,
        slowThreshold,
        criticalThreshold,
        reqId
      );
      req.timeline = recorder;

      let finished = false;
      const handleResponseEnd = () => {
        if (finished) return;
        finished = true;

        try {
          const summary = recorder.finish(res.statusCode);
          dispatchOutput(summary, options);
        } catch (err) {
          console.error("[reqtimeline] Error finishing timeline:", err);
        }
      };

      res.once("finish", handleResponseEnd);
      res.once("close", handleResponseEnd);
    } catch (err) {
      console.error("[reqtimeline] Error initializing timeline middleware:", err);
    }

    next();
  };

  return middlewareHandler;
} as unknown as TimelineMiddlewareFactory;

timeline.mark = function (name: string, middleware?: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.timeline) {
      if (middleware) {
        middleware(req, res, next);
        return;
      }
      next();
      return;
    }

    if (!middleware) {
      req.timeline.mark(name);
      next();
      return;
    }

    let nextCalled = false;
    const safeNext: NextFunction = (err?: unknown) => {
      if (nextCalled) return;
      nextCalled = true;
      next(err);
    };

    try {
      const result = req.timeline.time(name, () => {
        return new Promise<void>((resolve, reject) => {
          let settled = false;
          const settle = (err?: unknown) => {
            if (settled) return;
            settled = true;
            res.removeListener("finish", settle);
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          };

          const origNext: NextFunction = (err?: unknown) => {
            settle(err);
          };

          res.once("finish", settle);

          try {
            const syncResult = middleware(req, res, origNext);

            if (syncResult && typeof (syncResult as any).then === "function") {
              (syncResult as any).then(() => settle()).catch((e: unknown) => settle(e));
            }
          } catch (syncErr) {
            settle(syncErr);
          }
        });
      });

      result
        .then(() => {
          safeNext();
        })
        .catch((err: unknown) => {
          safeNext(err);
        });
    } catch (err: unknown) {
      safeNext(err);
    }
  };
};

timeline.getMetrics = function (): TimelineMetrics {
  return globalMetrics.getMetrics();
};

timeline.getFingerprints = function (): RouteFingerprint[] {
  return globalMetrics.fingerprints.getFingerprints();
};

timeline.getRouteStats = function (routeKey: string): RouteFingerprint | undefined {
  return globalMetrics.fingerprints.getRouteStats(routeKey);
};

timeline.resetMetrics = function (): void {
  globalMetrics.reset();
};

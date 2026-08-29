import type { Request, Response, NextFunction, RequestHandler } from "express";
import { TimelineRecorder } from "./recorder";
import { dispatchOutput } from "./output";
import type { TimelineOptions, TimelineMiddlewareFactory } from "./types";

/**
 * Main reqtimeline Express middleware factory.
 */
export const timeline: TimelineMiddlewareFactory = function (
  options: TimelineOptions = {}
): RequestHandler {
  const isEnabled =
    options.enabled ?? (process.env.NODE_ENV !== "production");
  const slowThreshold = options.slowThreshold ?? 50;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isEnabled) {
      next();
      return;
    }

    try {
      const url = req.originalUrl || req.url || "/";
      const recorder = new TimelineRecorder(req.method, url, slowThreshold);
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
};

/**
 * Helper to attach named step middleware or wrap middleware functions.
 */
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

    // Wrap middleware execution safely
    let nextCalled = false;
    const safeNext: NextFunction = (err?: any) => {
      if (nextCalled) return;
      nextCalled = true;
      next(err);
    };

    try {
      const result = req.timeline.time(name, () => {
        return new Promise<void>((resolve, reject) => {
          let settled = false;
          const settle = (err?: any) => {
            if (settled) return;
            settled = true;
            res.removeListener("finish", settle);
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          };

          const origNext: NextFunction = (err?: any) => {
            settle(err);
          };

          // If middleware handles response without calling next (e.g. res.send)
          res.once("finish", settle);

          try {
            const syncResult = middleware(req, res, origNext);

            if (syncResult && typeof (syncResult as any).then === "function") {
              (syncResult as any).then(() => settle()).catch((e: any) => settle(e));
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
        .catch((err: any) => {
          safeNext(err);
        });
    } catch (err) {
      safeNext(err);
    }
  };
};



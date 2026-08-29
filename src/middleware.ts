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

  return (req: Request, res: Response, next: NextFunction) => {
    if (!isEnabled) {
      return next();
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

    return next();
  };
};

/**
 * Helper to attach named step middleware or wrap middleware functions.
 */
timeline.mark = function (name: string, middleware?: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.timeline) {
      if (middleware) {
        return middleware(req, res, next);
      }
      return next();
    }

    if (!middleware) {
      req.timeline.mark(name);
      return next();
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
          let calledNextInHandler = false;

          const origNext: NextFunction = (err?: any) => {
            calledNextInHandler = true;
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          };

          try {
            const syncResult = middleware(req, res, origNext);

            if (syncResult && typeof (syncResult as any).then === "function") {
              (syncResult as any).then(() => resolve()).catch((e: any) => reject(e));
            } else if (!calledNextInHandler) {
              // If middleware finished synchronously and didn't call next (e.g. res.send), resolve step
              resolve();
            }
          } catch (syncErr) {
            reject(syncErr);
          }
        });
      });

      result
        .then(() => {
          // If the middleware called next in origNext, safeNext will be triggered via next() logic
          // If handler called res.send without next, safeNext won't be double invoked
          safeNext();
        })
        .catch((err) => {
          safeNext(err);
        });
    } catch (err) {
      safeNext(err);
    }
  };
};

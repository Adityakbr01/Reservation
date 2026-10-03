import type { NextFunction, Request, Response } from "express";

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wrap async route handlers so rejections reach the centralized error handler. */
export function asyncHandler(route: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(route(req, res, next)).catch(next);
  };
}

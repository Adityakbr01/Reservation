import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

interface Validatable {
  parse: (value: unknown) => unknown;
}

interface ValidationSchemas {
  body?: Validatable;
  params?: Validatable;
  query?: Validatable;
}

/** Zod validation for body/params/query. Throws 400 VALIDATION_ERROR on failure. */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request["params"];
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Request["query"];
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body) as Request["body"];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError("Validation failed", 400, "VALIDATION_ERROR", error.issues));
        return;
      }
      next(error);
    }
  };
}

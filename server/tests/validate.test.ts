import { describe, expect, test } from "bun:test";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../src/middleware/validate";

function runQueryValidation(query: unknown, schema: Parameters<typeof validate>[0]["query"]) {
  const req = { query } as Request;
  const res = {} as Response;
  let nextError: unknown = "not-called";
  const next = ((error?: unknown) => {
    nextError = error;
  }) as NextFunction;
  validate({ query: schema })(req, res, next);
  return { req, nextError };
}

describe("validate({ query })", () => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  });

  test("parses and coerces query into validatedQuery without touching req.query", () => {
    const original = { page: "2", limit: "5" };
    const { req, nextError } = runQueryValidation(original, schema);
    expect(nextError).toBeUndefined();
    expect((req as unknown as { validatedQuery: unknown }).validatedQuery).toEqual({
      page: 2,
      limit: 5,
    });
    expect(req.query).toEqual(original);
  });

  test("applies defaults for missing params", () => {
    const { req, nextError } = runQueryValidation({}, schema);
    expect(nextError).toBeUndefined();
    expect((req as unknown as { validatedQuery: unknown }).validatedQuery).toEqual({
      page: 1,
      limit: 10,
    });
  });

  test("forwards a validation failure to next()", () => {
    const { nextError } = runQueryValidation({ page: "0" }, schema);
    expect(nextError).toBeDefined();
  });
});

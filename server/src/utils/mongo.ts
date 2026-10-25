import { Prisma } from "@prisma/client";

/** Duplicate-key error (unique index violation for Prisma/MySQL/Mongo), race-safe by design. */
export function isDuplicateKeyError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  if (error instanceof Error) {
    const code = (error as unknown as { code?: unknown }).code;
    return code === 11000 || code === "ER_DUP_ENTRY" || code === 1062;
  }
  return false;
}

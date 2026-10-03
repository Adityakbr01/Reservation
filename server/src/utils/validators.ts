import { z } from "zod";

/** MongoDB ObjectId path parameter. Use on every :id route. */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const idParamsSchema = z.object({ id: objectIdSchema });

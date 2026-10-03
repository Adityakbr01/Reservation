import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { blockIdParamsSchema } from "./availability.schema";
import {
  createBlockHandler,
  deleteBlockHandler,
  listBlocksHandler,
} from "./availability.controller";
import { createBlockSchema, listBlocksQuerySchema } from "./availability.schema";

export const adminAvailabilityRouter = Router();

adminAvailabilityRouter.use(authenticate, authorize("admin"));
adminAvailabilityRouter.get("/", validate({ query: listBlocksQuerySchema }), listBlocksHandler);
adminAvailabilityRouter.post(
  "/blocks",
  validate({ body: createBlockSchema }),
  createBlockHandler,
);
adminAvailabilityRouter.delete(
  "/blocks/:id",
  validate({ params: blockIdParamsSchema }),
  deleteBlockHandler,
);

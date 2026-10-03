import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { mediaUpload } from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import {
  adminDeleteMediaHandler,
  adminListMediaHandler,
  adminUpdateMediaHandler,
  adminUploadMediaHandler,
} from "./media.controller";
import { listMediaQuerySchema, mediaIdParamsSchema, updateMediaSchema } from "./media.schema";

export const adminMediaRouter = Router();

adminMediaRouter.use(authenticate, authorize("admin"));
adminMediaRouter.post("/", mediaUpload, adminUploadMediaHandler);
adminMediaRouter.get("/", validate({ query: listMediaQuerySchema }), adminListMediaHandler);
adminMediaRouter.patch(
  "/:id",
  validate({ params: mediaIdParamsSchema, body: updateMediaSchema }),
  adminUpdateMediaHandler,
);
adminMediaRouter.delete("/:id", validate({ params: mediaIdParamsSchema }), adminDeleteMediaHandler);

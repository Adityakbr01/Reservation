import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { mediaUploadMany } from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import {
  adminDeleteMediaHandler,
  adminListFoldersHandler,
  adminListMediaHandler,
  adminReorderMediaHandler,
  adminResolveMediaHandler,
  adminUpdateMediaHandler,
  adminUploadMediaHandler,
  publicResolveMediaHandler,
} from "./media.controller";
import {
  listMediaQuerySchema,
  mediaIdParamsSchema,
  reorderMediaSchema,
  updateMediaSchema,
  uploadMediaBodySchema,
} from "./media.schema";

export const adminMediaRouter = Router();

adminMediaRouter.use(authenticate, authorize("admin"));
adminMediaRouter.post(
  "/",
  mediaUploadMany,
  validate({ body: uploadMediaBodySchema }),
  adminUploadMediaHandler,
);
adminMediaRouter.get("/", validate({ query: listMediaQuerySchema }), adminListMediaHandler);
adminMediaRouter.get("/folders", adminListFoldersHandler);
adminMediaRouter.get("/resolve", adminResolveMediaHandler);
adminMediaRouter.patch(
  "/:id",
  validate({ params: mediaIdParamsSchema, body: updateMediaSchema }),
  adminUpdateMediaHandler,
);
adminMediaRouter.post(
  "/reorder",
  validate({ body: reorderMediaSchema }),
  adminReorderMediaHandler,
);
adminMediaRouter.delete("/:id", validate({ params: mediaIdParamsSchema }), adminDeleteMediaHandler);

export const publicMediaRouter = Router();

publicMediaRouter.post("/resolve", publicResolveMediaHandler);

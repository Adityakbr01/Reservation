import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminCreateFakeReviewHandler,
  adminListReviewsHandler,
  adminModerateReviewHandler,
  createReviewHandler,
  publicListReviewsHandler,
} from "./review.controller";
import {
  adminCreateReviewSchema,
  createReviewSchema,
  listReviewsQuerySchema,
  moderateReviewSchema,
  publicListReviewsQuerySchema,
  reviewIdParamsSchema,
} from "./review.schema";

export const adminReviewsRouter = Router();
adminReviewsRouter.use(authenticate, authorize("admin"));
adminReviewsRouter.get("/", validate({ query: listReviewsQuerySchema }), adminListReviewsHandler);
adminReviewsRouter.post("/", validate({ body: adminCreateReviewSchema }), adminCreateFakeReviewHandler);
adminReviewsRouter.patch("/:id", validate({ params: reviewIdParamsSchema, body: moderateReviewSchema }), adminModerateReviewHandler);

export const publicReviewsRouter = Router();
publicReviewsRouter.get("/", validate({ query: publicListReviewsQuerySchema }), publicListReviewsHandler);

export const reviewsRouter = Router();
reviewsRouter.use(authenticate);
reviewsRouter.post("/", validate({ body: createReviewSchema }), createReviewHandler);

import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { requireUser } from "../../middleware/auth";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import { ReviewModel, listReviews, reviewSummary, toReview } from "./review.model";
import { createCustomerReview, checkReviewEligibility, listReviewRecords } from "./review.service";
import type { CreateReviewInput } from "./review.schema";

export const publicListReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as { page: number; limit: number; roomTypeId: string };
  const [result, summary] = await Promise.all([
    listReviews({ page: query.page, limit: query.limit, roomTypeId: query.roomTypeId, status: "PUBLISHED" }),
    reviewSummary(query.roomTypeId),
  ]);
  res.status(200).json({ success: true, data: result.data, meta: { ...result.meta, ...summary } });
});

export const createReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const { UserModel } = await import("../users/user.model");
  const userDoc = await UserModel.findById(user.id).select("name email").exec();
  const fullName = userDoc?.name?.trim() || userDoc?.email || "Guest";
  const result = await createCustomerReview(user.id, fullName, req.body as CreateReviewInput);
  await recordAudit(req, "REVIEW_CREATED", "review", { entityId: result.id });
  res.status(201).json({ success: true, data: result });
});

export const getReviewEligibilityHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as { roomTypeId: string };
  const eligible = await checkReviewEligibility(user.id, query.roomTypeId);
  res.status(200).json({ success: true, data: { eligible } });
});

export const adminListReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as {
    page: number;
    limit: number;
    roomTypeId?: string;
    status?: "PENDING" | "PUBLISHED" | "REJECTED";
  };
  const result = await listReviewRecords(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminCreateFakeReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateReviewInput & { authorName: string; isVerified?: boolean; status?: "PENDING" | "PUBLISHED" | "REJECTED" };
  const doc = await ReviewModel.create({
    roomTypeId: body.roomTypeId,
    userId: null,
    bookingId: body.bookingId ?? null,
    authorName: body.authorName,
    rating: body.rating,
    title: body.title ?? null,
    body: body.body,
    stayDate: body.stayDate ?? null,
    isVerified: body.isVerified ?? false,
    isAdminCreated: true,
    status: body.status ?? "PUBLISHED",
  });
  await recordAudit(req, "REVIEW_CREATED", "review", { entityId: doc._id.toString(), after: { fake: true } });
  res.status(201).json({ success: true, data: toReview(doc) });
});

export const adminModerateReviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ReviewModel.findByIdAndUpdate(
    req.params.id,
    { status: (req.body as { status: string }).status },
    { returnDocument: "after" },
  ).exec();
  if (!doc) res.status(404).json({ success: false, error: { code: "REVIEW_NOT_FOUND", message: "Review not found" } });
  else {
    await recordAudit(req, "REVIEW_MODERATED", "review", { entityId: doc._id.toString(), after: { status: doc.status } });
    res.status(200).json({ success: true, data: toReview(doc) });
  }
});

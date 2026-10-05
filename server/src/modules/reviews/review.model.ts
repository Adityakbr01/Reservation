import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

export const REVIEW_STATUSES = ["PENDING", "PUBLISHED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review {
  id: string;
  roomTypeId: string;
  userId: string | null;
  bookingId: string | null;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  stayDate: string | null;
  isVerified: boolean;
  isAdminCreated: boolean;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewDocument extends mongoose.Document {
  roomTypeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | null;
  bookingId: mongoose.Types.ObjectId | null;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  stayDate: string | null;
  isVerified: boolean;
  isAdminCreated: boolean;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new mongoose.Schema<ReviewDocument>(
  {
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    authorName: { type: String, required: true, trim: true, maxlength: 120 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: null, maxlength: 160 },
    body: { type: String, required: true, maxlength: 5000 },
    stayDate: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    isAdminCreated: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUSES, default: "PENDING", required: true },
  },
  { timestamps: true },
);

reviewSchema.index({ roomTypeId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1 }, { sparse: true });

export const ReviewModel =
  mongoose.models.Review ?? mongoose.model<ReviewDocument>("Review", reviewSchema);

export function toReview(doc: ReviewDocument): Review {
  return {
    id: doc._id.toString(),
    roomTypeId: doc.roomTypeId.toString(),
    userId: doc.userId ? doc.userId.toString() : null,
    bookingId: doc.bookingId ? doc.bookingId.toString() : null,
    authorName: doc.authorName,
    rating: doc.rating,
    title: doc.title,
    body: doc.body,
    stayDate: doc.stayDate,
    isVerified: doc.isVerified,
    isAdminCreated: doc.isAdminCreated,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listReviews(filter: {
  page: number;
  limit: number;
  roomTypeId?: string;
  status?: ReviewStatus;
}): Promise<Paginated<Review>> {
  const query: QueryFilter<ReviewDocument> = {};
  if (filter.roomTypeId) query.roomTypeId = filter.roomTypeId;
  if (filter.status) query.status = filter.status;
  const [total, docs] = await Promise.all([
    ReviewModel.countDocuments(query).exec(),
    ReviewModel.find(query).sort({ createdAt: -1 }).skip((filter.page - 1) * filter.limit).limit(filter.limit).exec(),
  ]);
  return paginatedResponse(docs.map(toReview), filter.page, filter.limit, total);
}

export async function reviewSummary(roomTypeId: string): Promise<{ count: number; average: number }> {
  const rows = await ReviewModel.aggregate([
    { $match: { roomTypeId: new mongoose.Types.ObjectId(roomTypeId), status: "PUBLISHED" } },
    { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } },
  ]).exec();
  const row = rows[0] as { count: number; average: number } | undefined;
  return { count: row?.count ?? 0, average: row?.average ? Math.round(row.average * 10) / 10 : 0 };
}

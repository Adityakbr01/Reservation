import mongoose from "mongoose";
import { AppError } from "../../utils/app-error";
import { BookingModel } from "../bookings/booking.model";
import { BookingItemModel } from "../bookings/booking-item.model";
import { ReviewModel, listReviews, reviewSummary, toReview } from "./review.model";
import type { CreateReviewInput } from "./review.schema";

/** Eligibility: a CHECKED_OUT booking with a matching room-type item. One review per booking. */
export async function assertReviewEligible(userId: string, roomTypeId: string, bookingId?: string | null) {
  const bookingQuery: Record<string, unknown> = { userId, status: "CHECKED_OUT" };
  if (bookingId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
    const booking = await BookingModel.findOne({ _id: bookingId, userId, status: "CHECKED_OUT" }).exec();
    if (!booking) throw new AppError("Only completed stays can be reviewed", 403, "REVIEW_NOT_ELIGIBLE");
    const item = await BookingItemModel.findOne({ bookingId: booking._id, roomTypeId }).exec();
    if (!item) throw new AppError("This booking did not include this room", 403, "REVIEW_NOT_ELIGIBLE");
    const existing = await ReviewModel.findOne({ bookingId: booking._id }).exec();
    if (existing) throw new AppError("This stay was already reviewed", 409, "REVIEW_EXISTS");
    return booking;
  }
  const bookings = await BookingModel.find(bookingQuery).select("_id").exec();
  if (bookings.length === 0) throw new AppError("Only completed stays can be reviewed", 403, "REVIEW_NOT_ELIGIBLE");
  const items = await BookingItemModel.find({
    bookingId: { $in: bookings.map((b) => b._id) },
    roomTypeId,
  })
    .select("bookingId")
    .exec();
  if (items.length === 0) throw new AppError("Only guests who stayed here can review", 403, "REVIEW_NOT_ELIGIBLE");
  return null;
}

export async function createCustomerReview(userId: string, authorName: string, input: CreateReviewInput) {
  const booking = await assertReviewEligible(userId, input.roomTypeId, input.bookingId ?? null);
  const doc = await ReviewModel.create({
    roomTypeId: input.roomTypeId,
    userId,
    bookingId: booking?._id ?? (input.bookingId ? new mongoose.Types.ObjectId(input.bookingId) : null),
    authorName,
    rating: input.rating,
    title: input.title ?? null,
    body: input.body,
    stayDate: input.stayDate ?? null,
    isVerified: true,
    isAdminCreated: false,
    status: "PENDING",
  });
  return toReview(doc);
}

export async function listReviewRecords(filter: { page: number; limit: number; roomTypeId?: string; status?: "PENDING" | "PUBLISHED" | "REJECTED" }) {
  return listReviews(filter);
}

export async function getReviewSummary(roomTypeId: string) {
  return reviewSummary(roomTypeId);
}

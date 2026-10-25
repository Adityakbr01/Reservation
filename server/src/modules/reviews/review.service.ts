import { AppError } from "../../utils/app-error";
import { prisma } from "../../config/database";
import { ReviewModel, listReviews, reviewSummary, toReview } from "./review.model";
import type { CreateReviewInput } from "./review.schema";

/** Eligibility: a CHECKED_OUT booking with a matching room-type item. One review per booking. */
export async function assertReviewEligible(userId: string, roomTypeId: string, bookingId?: string | null) {
  if (bookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId, status: "CHECKED_OUT" },
    });
    if (!booking) throw new AppError("Only completed stays can be reviewed", 403, "REVIEW_NOT_ELIGIBLE");
    const item = await prisma.bookingItem.findFirst({
      where: { bookingId: booking.id, roomTypeId },
    });
    if (!item) throw new AppError("This booking did not include this room", 403, "REVIEW_NOT_ELIGIBLE");
    const existing = await ReviewModel.findOne({ bookingId: booking.id }).exec();
    if (existing) throw new AppError("This stay was already reviewed", 409, "REVIEW_EXISTS");
    return booking;
  }
  const bookings = await prisma.booking.findMany({
    where: { userId, status: "CHECKED_OUT" },
    select: { id: true },
  });
  if (bookings.length === 0) throw new AppError("Only completed stays can be reviewed", 403, "REVIEW_NOT_ELIGIBLE");
  const items = await prisma.bookingItem.findMany({
    where: {
      bookingId: { in: bookings.map((b) => b.id) },
      roomTypeId,
    },
    select: { bookingId: true },
  });
  if (items.length === 0) throw new AppError("Only guests who stayed here can review", 403, "REVIEW_NOT_ELIGIBLE");
  return null;
}

/** Non-throwing eligibility probe for the room page: completed stay in this room type. */
export async function checkReviewEligibility(userId: string, roomTypeId: string): Promise<boolean> {
  const bookings = await prisma.booking.findMany({
    where: { userId, status: "CHECKED_OUT" },
    select: { id: true },
  });
  if (bookings.length === 0) return false;
  const item = await prisma.bookingItem.findFirst({
    where: {
      bookingId: { in: bookings.map((b) => b.id) },
      roomTypeId,
    },
    select: { id: true },
  });
  return item !== null;
}

export async function createCustomerReview(userId: string, authorName: string, input: CreateReviewInput) {
  const booking = await assertReviewEligible(userId, input.roomTypeId, input.bookingId ?? null);
  const doc = await ReviewModel.create({
    roomTypeId: input.roomTypeId,
    userId,
    bookingId: booking?.id ?? (input.bookingId ? input.bookingId : null),
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

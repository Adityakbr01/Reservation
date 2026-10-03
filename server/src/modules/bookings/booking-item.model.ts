import mongoose from "mongoose";
import type { BookingGuests } from "./booking.types";

export interface BookingItemDocument extends mongoose.Document {
  bookingId: mongoose.Types.ObjectId;
  roomTypeId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId | null;
  ratePlanId: mongoose.Types.ObjectId;
  roomNameSnapshot: string;
  roomNumberSnapshot: string | null;
  ratePlanNameSnapshot: string;
  checkIn: Date;
  checkOut: Date;
  guests: BookingGuests;
  pricing: {
    nightlyRates: Array<{ date: Date; amount: number }>;
    subtotal: number;
    discount: number;
    taxes: number;
    fees: number;
    total: number;
    currency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const nightlyRateSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const itemPricingSchema = new mongoose.Schema(
  {
    nightlyRates: { type: [nightlyRateSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    taxes: { type: Number, required: true, min: 0, default: 0 },
    fees: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
  },
  { _id: false },
);

const bookingItemSchema = new mongoose.Schema<BookingItemDocument>(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },
    ratePlanId: { type: mongoose.Schema.Types.ObjectId, ref: "RatePlan", required: true },
    roomNameSnapshot: { type: String, required: true },
    roomNumberSnapshot: { type: String, default: null },
    ratePlanNameSnapshot: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, required: true, min: 0 },
    },
    pricing: { type: itemPricingSchema, required: true },
  },
  { timestamps: true },
);

bookingItemSchema.index({ bookingId: 1 });
bookingItemSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });

// Guarded for --hot reloads.
export const BookingItemModel =
  mongoose.models.BookingItem ??
  mongoose.model<BookingItemDocument>("BookingItem", bookingItemSchema);

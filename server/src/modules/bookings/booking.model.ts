import mongoose from "mongoose";
import { BOOKING_SOURCES, BOOKING_STATUSES, PAYMENT_STATUSES } from "./booking.types";
import type {
  BookingGuests,
  BookingContact,
  BookingPricing,
  BookingSource,
  BookingStatus,
  PaymentStatus,
} from "./booking.types";

export interface BookingDocument extends mongoose.Document {
  bookingNumber: string;
  propertyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  checkIn: Date;
  checkOut: Date;
  guests: BookingGuests;
  contact: BookingContact;
  pricing: BookingPricing;
  cancellation: {
    cancelledAt: Date | null;
    cancelledBy: mongoose.Types.ObjectId | null;
    reason: string | null;
  };
  hold: {
    holdId: string | null;
    expiresAt: Date | null;
  };
  source: BookingSource;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const guestsSchema = new mongoose.Schema<BookingGuests>(
  {
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const contactSchema = new mongoose.Schema<BookingContact>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
  },
  { _id: false },
);

const pricingSchema = new mongoose.Schema<BookingPricing>(
  {
    currency: { type: String, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    taxes: { type: Number, required: true, min: 0, default: 0 },
    fees: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: { type: String, default: null },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema<BookingDocument>(
  {
    bookingNumber: { type: String, required: true, unique: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: BOOKING_STATUSES, default: "HELD", required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "PENDING", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: guestsSchema, required: true },
    contact: { type: contactSchema, required: true },
    pricing: { type: pricingSchema, required: true },
    cancellation: {
      cancelledAt: { type: Date, default: null },
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reason: { type: String, default: null },
    },
    hold: {
      holdId: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    source: { type: String, enum: BOOKING_SOURCES, default: "DIRECT", required: true },
    notes: { type: String, default: null },
  },
  { timestamps: true },
);

bookingSchema.index({ bookingNumber: 1 }, { unique: true });
bookingSchema.index({ propertyId: 1, status: 1, checkIn: 1 });
bookingSchema.index({ propertyId: 1, checkOut: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ contact: 1, createdAt: -1 });

// Guarded for --hot reloads.
export const BookingModel =
  mongoose.models.Booking ?? mongoose.model<BookingDocument>("Booking", bookingSchema);

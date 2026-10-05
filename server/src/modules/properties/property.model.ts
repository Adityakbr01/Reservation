import mongoose from "mongoose";
import { PROPERTY_STATUSES } from "./property.types";
import type { PropertyContact, PropertyStatus } from "./property.types";

export interface PropertyDocument extends mongoose.Document {
  name: string;
  slug: string;
  description: string | null;
  contact: PropertyContact;
  mapEmbedUrl: string | null;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  currency: string;
  status: PropertyStatus;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new mongoose.Schema<PropertyContact>(
  {
    email: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    postalCode: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { _id: false },
);

const propertySchema = new mongoose.Schema<PropertyDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: null },
    contact: { type: contactSchema, default: () => ({}) },
    mapEmbedUrl: { type: String, default: null, maxlength: 1000 },
    checkInTime: { type: String, required: true, default: "14:00" },
    checkOutTime: { type: String, required: true, default: "12:00" },
    timezone: { type: String, required: true, default: "Asia/Kolkata" },
    currency: { type: String, required: true, default: "INR" },
    status: { type: String, enum: PROPERTY_STATUSES, default: "ACTIVE", required: true },
  },
  { timestamps: true },
);

// Guarded for --hot reloads.
export const PropertyModel =
  mongoose.models.Property ?? mongoose.model<PropertyDocument>("Property", propertySchema);

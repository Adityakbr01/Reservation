import mongoose from "mongoose";
import { ROOM_TYPE_STATUSES } from "./room-type.types";
import type {
  RoomTypeBed,
  RoomTypeImage,
  RoomTypeSeo,
  RoomTypeStatus,
} from "./room-type.types";

export interface RoomTypeDocument extends mongoose.Document {
  propertyId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds: RoomTypeBed[];
  amenities: string[];
  images: RoomTypeImage[];
  status: RoomTypeStatus;
  seo: RoomTypeSeo | null;
  createdAt: Date;
  updatedAt: Date;
}

const bedSchema = new mongoose.Schema<RoomTypeBed>(
  {
    // NOTE: nested `type:` key needs the explicit { type: ... } wrapper.
    type: { type: String, required: true, trim: true, maxlength: 60 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema<RoomTypeImage>(
  {
    mediaId: { type: String, required: true },
    altText: { type: String, default: null },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const seoSchema = new mongoose.Schema<RoomTypeSeo>(
  {
    title: { type: String, default: null },
    description: { type: String, default: null },
    canonicalUrl: { type: String, default: null },
    ogTitle: { type: String, default: null },
    ogDescription: { type: String, default: null },
    ogImage: { type: String, default: null },
    noIndex: { type: Boolean, default: false },
  },
  { _id: false },
);

const roomTypeSchema = new mongoose.Schema<RoomTypeDocument>(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug: { type: String, required: true, trim: true, maxlength: 140 },
    shortDescription: { type: String, default: null },
    description: { type: String, default: null },
    maxAdults: { type: Number, required: true, min: 1, max: 20 },
    maxChildren: { type: Number, required: true, min: 0, max: 20 },
    maxOccupancy: { type: Number, required: true, min: 1, max: 30 },
    beds: { type: [bedSchema], default: [] },
    amenities: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    status: { type: String, enum: ROOM_TYPE_STATUSES, default: "DRAFT", required: true },
    seo: { type: seoSchema, default: null },
  },
  { timestamps: true },
);

roomTypeSchema.index({ propertyId: 1, slug: 1 }, { unique: true });
roomTypeSchema.index({ propertyId: 1, status: 1 });

// Guarded for --hot reloads.
export const RoomTypeModel =
  mongoose.models.RoomType ?? mongoose.model<RoomTypeDocument>("RoomType", roomTypeSchema);

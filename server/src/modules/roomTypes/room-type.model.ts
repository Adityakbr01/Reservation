import mongoose from "mongoose";
import { ROOM_TYPE_STATUSES } from "./room-type.types";
import type {
  NearbyAttraction,
  RoomTypeBed,
  RoomTypeImage,
  RoomTypeMedia,
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
  media: RoomTypeMedia[];
  propertyDetailsHtml: string | null;
  layoutHtml: string | null;
  floorplanMediaIds: string[];
  locationText: string | null;
  surroundingsHtml: string | null;
  mapLat: number | null;
  mapLng: number | null;
  mapEmbedUrl: string | null;
  welcomeHamperIncluded: boolean;
  welcomeHamperDescription: string | null;
  welcomeHamperImageMediaId: string | null;
  /** Rich hamper content (full CKEditor: headings, lists, links, images). */
  welcomeHamperHtml: string | null;
  nearbyAttractions: NearbyAttraction[];
  amenityIds: mongoose.Types.ObjectId[];
  bedrooms: number | null;
  bathrooms: number | null;
  maxDogs: number | null;
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

const mediaSchema = new mongoose.Schema<RoomTypeMedia>(
  {
    mediaId: { type: String, required: true },
    kind: { type: String, enum: ["image", "video"], default: "image" },
    altText: { type: String, default: null },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const nearbyAttractionSchema = new mongoose.Schema<NearbyAttraction>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, maxlength: 300 },
    imageMediaId: { type: String, default: null },
    url: { type: String, default: null, maxlength: 500 },
  },
  { _id: false },
);

const seoSchema = new mongoose.Schema<RoomTypeSeo>(  {
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
    media: { type: [mediaSchema], default: [] },
    propertyDetailsHtml: { type: String, default: null },
    layoutHtml: { type: String, default: null },
    floorplanMediaIds: { type: [String], default: [] },
    locationText: { type: String, default: null },
    surroundingsHtml: { type: String, default: null },
    mapLat: { type: Number, default: null },
    mapLng: { type: Number, default: null },
    mapEmbedUrl: { type: String, default: null },
    welcomeHamperIncluded: { type: Boolean, default: false },
    welcomeHamperDescription: { type: String, default: null },
    welcomeHamperImageMediaId: { type: String, default: null },
    welcomeHamperHtml: { type: String, default: null },
    nearbyAttractions: { type: [nearbyAttractionSchema], default: [] },
    amenityIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Amenity" }], default: [] },
    bedrooms: { type: Number, default: null },
    bathrooms: { type: Number, default: null, min: 0, max: 20 },
    maxDogs: { type: Number, default: null },
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

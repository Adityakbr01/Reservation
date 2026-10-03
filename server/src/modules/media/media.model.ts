import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

export interface Media {
  id: string;
  fileName: string;
  url: string;
  storageKey: string;
  mime: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
  size: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaDocument extends mongoose.Document {
  fileName: string;
  url: string;
  storageKey: string;
  mime: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  caption: string | null;
  size: number;
  createdBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new mongoose.Schema<MediaDocument>(
  {
    fileName: { type: String, required: true },
    url: { type: String, required: true },
    storageKey: { type: String, required: true, unique: true },
    mime: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    alt: { type: String, default: null, maxlength: 200 },
    caption: { type: String, default: null, maxlength: 300 },
    size: { type: Number, required: true, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

mediaSchema.index({ createdAt: -1 });

// Guarded for --hot reloads.
export const MediaModel =
  mongoose.models.Media ?? mongoose.model<MediaDocument>("Media", mediaSchema);

export function toMedia(doc: MediaDocument): Media {
  return {
    id: doc._id.toString(),
    fileName: doc.fileName,
    url: doc.url,
    storageKey: doc.storageKey,
    mime: doc.mime,
    width: doc.width,
    height: doc.height,
    alt: doc.alt,
    caption: doc.caption,
    size: doc.size,
    createdBy: doc.createdBy ? doc.createdBy.toString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface ListMediaFilter {
  page: number;
  limit: number;
  q?: string;
}

export async function listMedia(filter: ListMediaFilter): Promise<Paginated<Media>> {
  const query: QueryFilter<MediaDocument> = {};
  if (filter.q) query.fileName = { $regex: filter.q, $options: "i" };
  const [total, docs] = await Promise.all([
    MediaModel.countDocuments(query).exec(),
    MediaModel.find(query)
      .sort({ createdAt: -1 })
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toMedia(doc)),
    filter.page,
    filter.limit,
    total,
  );
}

export async function findMediaById(id: string): Promise<Media | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await MediaModel.findById(id).exec();
  return doc ? toMedia(doc) : null;
}

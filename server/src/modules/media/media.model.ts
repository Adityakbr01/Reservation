import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

export type MediaKind = "image" | "video";

export interface Media {
  id: string;
  fileName: string;
  url: string;
  storageKey: string;
  mime: string;
  kind: MediaKind;
  /** Logical folder, e.g. "Cottage/Oakwood Cottage". Null = library root. */
  folder: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
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
  kind: MediaKind;
  folder: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
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
    kind: { type: String, enum: ["image", "video"], default: "image" },
    folder: { type: String, default: null, maxlength: 200 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    durationSec: { type: Number, default: null },
    alt: { type: String, default: null, maxlength: 200 },
    caption: { type: String, default: null, maxlength: 300 },
    size: { type: Number, required: true, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ folder: 1, createdAt: -1 });

// Guarded for --hot reloads.
export const MediaModel =
  mongoose.models.Media ?? mongoose.model<MediaDocument>("Media", mediaSchema);

export function mediaKindFor(mime: string, kind?: string | null): MediaKind {
  if (kind === "video") return "video";
  return mime.startsWith("video/") ? "video" : "image";
}

export function toMedia(doc: MediaDocument): Media {
  return {
    id: doc._id.toString(),
    fileName: doc.fileName,
    url: doc.url,
    storageKey: doc.storageKey,
    mime: doc.mime,
    kind: mediaKindFor(doc.mime, (doc as MediaDocument).kind),
    folder: doc.folder ?? null,
    width: doc.width,
    height: doc.height,
    durationSec: doc.durationSec ?? null,
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
  kind?: MediaKind;
  /** Exact folder match; "__root__" lists only unfiled items. */
  folder?: string;
}

/** Folder path segment rules shared by upload + move. Pure — unit-tested. */
export function normalizeFolderPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .split("/")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => part.length > 0 && part !== "." && part !== "..")
    .slice(0, 3)
    .map((part) => part.slice(0, 60))
    .join("/");
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Folder filter value → Mongo predicate. Exact path matches one folder;
 * a trailing "/*" matches the whole subtree (sidebar parent rows).
 * Pure — unit-tested.
 */
export function folderQuery(folder: string): null | string | { $regex: string } {
  if (folder === "__root__") return null;
  if (folder.endsWith("/*")) {
    const prefix = folder
      .slice(0, -2)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { $regex: `^${prefix}/` };
  }
  return folder;
}

/** Distinct folders for the library sidebar, sorted. */
export async function listMediaFolders(): Promise<string[]> {
  const folders = await MediaModel.distinct("folder").exec();
  return (folders as unknown[])
    .filter((f): f is string => typeof f === "string" && f.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

export async function listMedia(filter: ListMediaFilter): Promise<Paginated<Media>> {
  const query: QueryFilter<MediaDocument> = {};
  if (filter.q) query.fileName = { $regex: filter.q, $options: "i" };
  if (filter.kind) {
    if (filter.kind === "video") {
      query.$or = [{ kind: "video" }, { mime: { $regex: "^video/" } }];
    } else {
      query.kind = "image";
    }
  }
  if (filter.folder !== undefined) {
    query.folder = folderQuery(filter.folder) as QueryFilter<MediaDocument>["folder"];
  }
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

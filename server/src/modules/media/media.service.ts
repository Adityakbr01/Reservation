import mongoose from "mongoose";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { slugify } from "../../utils/slug";
import { getImageKit } from "../../integrations/imagekit/imagekit.client";
import { BlogPostModel, OfferModel, PageModel } from "../cms/cms.model";
import { MediaModel, findMediaById, listMedia, normalizeFolderPath, toMedia } from "./media.model";
import type { ListMediaFilter, Media } from "./media.model";

const MEDIA_FOLDER = "reservation/media";

export interface UploadMediaInput {
  data: Buffer;
  fileName: string;
  mime: string;
  size: number;
  alt?: string | null;
  caption?: string | null;
  folder?: string | null;
  createdBy?: string | null;
}

/** Validate → external store → URL/key → Mongo metadata (docs 08 §41). */
export async function uploadMedia(input: UploadMediaInput): Promise<Media> {
  // Human-readable folder stays in Mongo ("Cottage/Fern Cottage");
  // ImageKit paths must be URL-safe, so segments are slugified there.
  const folder = normalizeFolderPath(input.folder);
  const storageFolder = folder
    ? `${MEDIA_FOLDER}/${folder.split("/").map((part) => slugify(part) || "misc").join("/")}`
    : MEDIA_FOLDER;
  let result: { url: string; fileId: string; width?: number; height?: number };
  try {
    const uploaded = await getImageKit().upload({
      file: input.data,
      fileName: `${Date.now()}-${input.fileName}`,
      folder: storageFolder,
    });
    result = {
      url: uploaded.url,
      fileId: uploaded.fileId,
      width: (uploaded as { width?: number }).width,
      height: (uploaded as { height?: number }).height,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Media upload failed", { message });
    throw new AppError("Media upload failed, please try again", 502, "MEDIA_UPLOAD_FAILED");
  }
  const kind = input.mime.startsWith("video/") ? "video" : "image";
  const doc = await MediaModel.create({
    fileName: input.fileName,
    url: result.url,
    storageKey: result.fileId,
    mime: input.mime,
    kind,
    folder,
    width: result.width ?? null,
    height: result.height ?? null,
    durationSec: null,
    alt: input.alt ?? null,
    caption: input.caption ?? null,
    size: input.size,
    createdBy: input.createdBy ?? null,
  });
  return toMedia(doc);
}

export async function updateMediaMeta(
  id: string,
  patch: { alt?: string | null; caption?: string | null; folder?: string | null },
): Promise<Media> {
  const doc = await MediaModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
        ...(patch.caption !== undefined ? { caption: patch.caption } : {}),
        // Logical move only: the stored file URL stays valid, the library
        // grouping changes. Physical re-upload is never required.
        ...(patch.folder !== undefined ? { folder: normalizeFolderPath(patch.folder) } : {}),
      },
    },
    { returnDocument: "after" },
  ).exec();
  if (!doc) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  return toMedia(doc);
}

export interface MediaReference {
  collection: string;
  id: string;
}

/**
 * Reference check before deletion (docs 08 §47, 07 §66). Published content
 * referencing the file blocks deletion; replacement keeps the ref stable.
 */
export async function findMediaReferences(mediaId: string): Promise<MediaReference[]> {
  const refs: MediaReference[] = [];
  const [pages, posts, offers] = await Promise.all([
    PageModel.find({
      $or: [
        { featuredImageMediaId: mediaId },
        { "sections.imageMediaId": mediaId },
        { "sections.mediaIds": mediaId },
        { "seo.ogImageMediaId": mediaId },
      ],
    })
      .select("_id")
      .exec(),
    BlogPostModel.find({
      $or: [{ featuredImageMediaId: mediaId }, { "seo.ogImageMediaId": mediaId }],
    })
      .select("_id")
      .exec(),
    OfferModel.find({
      $or: [{ imageMediaId: mediaId }, { "seo.ogImageMediaId": mediaId }],
    })
      .select("_id")
      .exec(),
  ]);
  for (const doc of pages) refs.push({ collection: "pages", id: doc._id.toString() });
  for (const doc of posts) refs.push({ collection: "blogs", id: doc._id.toString() });
  for (const doc of offers) refs.push({ collection: "offers", id: doc._id.toString() });
  return refs;
}

export async function deleteMedia(id: string): Promise<void> {
  const media = await findMediaById(id);
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  const refs = await findMediaReferences(id);
  if (refs.length > 0) {
    throw new AppError(
      `Media is used by ${refs.length} published item(s) — replace it there first`,
      409,
      "MEDIA_IN_USE",
    );
  }
  try {
    await getImageKit().deleteFile(media.storageKey);
  } catch (error) {
    logger.warn("ImageKit media cleanup failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  await MediaModel.deleteOne({ _id: id }).exec();
}

export async function listAllMedia(filter: ListMediaFilter) {
  return listMedia(filter);
}

export interface ResolvedMedia {
  id: string;
  url: string;
  alt: string | null;
  mime: string;
  kind: "image" | "video";
}

/** Batch URL resolution for editors/renderers. Skips unknown ids silently. */
export async function resolveMedia(ids: string[]): Promise<ResolvedMedia[]> {
  const unique = [...new Set(ids)].filter((id) => mongoose.Types.ObjectId.isValid(id)).slice(0, 50);
  if (unique.length === 0) return [];
  const docs = await MediaModel.find({ _id: { $in: unique } })
    .select("url alt mime kind")
    .exec();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    url: doc.url,
    alt: doc.alt,
    mime: doc.mime,
    kind: doc.mime?.startsWith("video/") || doc.kind === "video" ? "video" : "image",
  }));
}

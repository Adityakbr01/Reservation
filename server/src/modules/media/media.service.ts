import mongoose from "mongoose";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import {
  buildMediaKey,
  publicAssetUrl,
} from "../../integrations/storage/storage-keys";
import {
  removeFileFromGoDaddy,
  uploadBufferToGoDaddy,
} from "../../integrations/storage/godaddy-storage";
import { BlogPostModel, OfferModel, PageModel } from "../cms/cms.model";
import { RoomTypeModel } from "../roomTypes/room-type.model";
import { SiteSettingsModel } from "../settings/settings.model";
import { AmenityModel } from "../amenities/amenity.model";
import { MediaModel, findMediaById, listMedia, normalizeFolderPath, toMedia } from "./media.model";
import type { ListMediaFilter, Media } from "./media.model";

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

/** Validate → FTP store → URL/key → Mongo metadata. */
export async function uploadMedia(input: UploadMediaInput): Promise<Media> {
  const folder = normalizeFolderPath(input.folder);
  const baseUrl = env.ASSETS_BASE_URL;
  if (!baseUrl) {
    throw new AppError("Asset storage is not configured", 503, "STORAGE_NOT_CONFIGURED");
  }
  const kind = input.mime.startsWith("video/") ? "video" : "image";
  const key = buildMediaKey(input.fileName, input.mime);
  try {
    await uploadBufferToGoDaddy(key, input.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Media upload failed", { message });
    throw new AppError("Media upload failed, please try again", 502, "MEDIA_UPLOAD_FAILED");
  }
  try {
    const doc = await MediaModel.create({
      fileName: input.fileName,
      url: publicAssetUrl(baseUrl, key),
      storageKey: key,
      storageProvider: "ftp",
      mime: input.mime,
      kind,
      folder,
      width: null,
      height: null,
      durationSec: null,
      alt: input.alt ?? null,
      caption: input.caption ?? null,
      size: input.size ?? input.data.length,
      createdBy: input.createdBy ?? null,
    });
    return toMedia(doc);
  } catch (error) {
    await removeFileFromGoDaddy(key).catch((cleanupError: unknown) => {
      logger.warn("GoDaddy orphan cleanup failed", {
        message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        key,
      });
    });
    throw error;
  }
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
 * Covers id-referenced collections (CMS, room types, settings, amenities).
 * CKEditor HTML embeds raw URLs and is migrated separately (backfill script).
 */
export async function findMediaReferences(mediaId: string): Promise<MediaReference[]> {
  const refs: MediaReference[] = [];
  const [pages, posts, offers, roomTypes, settings, amenities] = await Promise.all([
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
    RoomTypeModel.find({
      $or: [
        { "media.mediaId": mediaId },
        { "images.mediaId": mediaId },
        { floorplanMediaIds: mediaId },
        { welcomeHamperImageMediaId: mediaId },
      ],
    })
      .select("_id")
      .exec(),
    SiteSettingsModel.find({
      $or: [{ logoMediaId: mediaId }, { faviconMediaId: mediaId }, { "defaultSeo.ogImageMediaId": mediaId }],
    })
      .select("_id")
      .exec(),
    AmenityModel.find({ imageMediaId: mediaId }).select("_id").exec(),
  ]);
  for (const doc of pages) refs.push({ collection: "pages", id: doc._id.toString() });
  for (const doc of posts) refs.push({ collection: "blogs", id: doc._id.toString() });
  for (const doc of offers) refs.push({ collection: "offers", id: doc._id.toString() });
  for (const doc of roomTypes) refs.push({ collection: "roomTypes", id: doc._id.toString() });
  for (const doc of settings) refs.push({ collection: "settings", id: doc._id.toString() });
  for (const doc of amenities) refs.push({ collection: "amenities", id: doc._id.toString() });
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
    await removeFileFromGoDaddy(media.storageKey);
  } catch (error) {
    logger.warn("Media binary cleanup failed", {
      message: error instanceof Error ? error.message : String(error),
      storageProvider: media.storageProvider,
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

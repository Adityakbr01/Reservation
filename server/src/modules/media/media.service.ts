import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { buildMediaKey } from "../../integrations/storage/storage-keys";
import {
  removeFile,
  uploadBuffer,
} from "../../integrations/storage/godaddy-storage";
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
  position?: number;
  createdBy?: string | null;
}

/** Validate → Universal store (FTP or local persistent disk) → URL/key → metadata. */
export async function uploadMedia(input: UploadMediaInput): Promise<Media> {
  const folder = normalizeFolderPath(input.folder);
  const kind = input.mime.startsWith("video/") ? "video" : "image";
  const key = buildMediaKey(input.fileName, input.mime);
  let result: { url: string; provider: "ftp" | "local" };
  try {
    result = await uploadBuffer(key, input.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Media upload failed", { message });
    throw new AppError("Media upload failed, please try again", 502, "MEDIA_UPLOAD_FAILED");
  }
  try {
    const doc = await MediaModel.create({
      fileName: input.fileName,
      url: result.url,
      storageKey: key,
      storageProvider: result.provider,
      mime: input.mime,
      kind,
      folder,
      width: null,
      height: null,
      durationSec: null,
      alt: input.alt ?? null,
      caption: input.caption ?? null,
      size: input.size ?? input.data.length,
      position: input.position ?? 0,
      createdBy: input.createdBy ?? null,
    });
    return toMedia(doc);
  } catch (error) {
    await removeFile(key).catch((cleanupError: unknown) => {
      logger.warn("Media orphan cleanup failed", {
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
 */
export async function findMediaReferences(mediaId: string): Promise<MediaReference[]> {
  const refs: MediaReference[] = [];
  const [pages, posts, offers, roomTypes, settings, amenities] = await Promise.all([
    prisma.cmsPage.findMany({
      select: { id: true, featuredImageMediaId: true, seo: true, sections: true },
    }),
    prisma.cmsBlogPost.findMany({
      select: { id: true, featuredImageMediaId: true, seo: true },
    }),
    prisma.cmsOffer.findMany({
      select: { id: true, imageMediaId: true, seo: true },
    }),
    prisma.roomType.findMany({
      select: {
        id: true,
        welcomeHamperImageMediaId: true,
        floorplanMediaIds: true,
        images: true,
        media: true,
      },
    }),
    prisma.siteSettings.findMany({
      select: { id: true, logoMediaId: true, faviconMediaId: true, defaultSeo: true },
    }),
    prisma.amenity.findMany({ select: { id: true, imageMediaId: true } }),
  ]);

  for (const doc of pages) {
    const seoOg = (doc.seo as any)?.ogImageMediaId;
    if (doc.featuredImageMediaId === mediaId || seoOg === mediaId) {
      refs.push({ collection: "pages", id: doc.id });
    }
  }
  for (const doc of posts) {
    const seoOg = (doc.seo as any)?.ogImageMediaId;
    if (doc.featuredImageMediaId === mediaId || seoOg === mediaId) {
      refs.push({ collection: "blogs", id: doc.id });
    }
  }
  for (const doc of offers) {
    const seoOg = (doc.seo as any)?.ogImageMediaId;
    if (doc.imageMediaId === mediaId || seoOg === mediaId) {
      refs.push({ collection: "offers", id: doc.id });
    }
  }
  for (const rt of roomTypes) {
    let matched = false;
    if (rt.welcomeHamperImageMediaId === mediaId) matched = true;
    else if (Array.isArray(rt.floorplanMediaIds) && (rt.floorplanMediaIds as string[]).includes(mediaId)) matched = true;
    else if (Array.isArray(rt.images) && (rt.images as any[]).some((i) => i.mediaId === mediaId)) matched = true;
    else if (Array.isArray(rt.media) && (rt.media as any[]).some((m) => m.mediaId === mediaId)) matched = true;
    if (matched) refs.push({ collection: "roomTypes", id: rt.id });
  }
  for (const doc of settings) {
    const defSeoOg = (doc.defaultSeo as any)?.ogImageMediaId;
    if (doc.logoMediaId === mediaId || doc.faviconMediaId === mediaId || defSeoOg === mediaId) {
      refs.push({ collection: "settings", id: doc.id });
    }
  }
  for (const item of amenities) {
    if (item.imageMediaId === mediaId) {
      refs.push({ collection: "amenities", id: item.id });
    }
  }
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
    await removeFile(media.storageKey);
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

/** Reorder media items within a folder. Expects items sorted in the desired order. */
export async function reorderMedia(
  items: Array<{ id: string; position: number }>,
): Promise<void> {
  if (items.length === 0) return;
  await prisma.$transaction(
    items.map(({ id, position }) =>
      prisma.media.update({
        where: { id },
        data: { position },
      }),
    ),
  );
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
  const unique = [...new Set(ids)].filter((id) => id && id.length === 24).slice(0, 50);
  if (unique.length === 0) return [];
  const docs = await prisma.media.findMany({
    where: { id: { in: unique } },
    select: { id: true, url: true, alt: true, mime: true, kind: true },
  });
  return docs.map((doc) => ({
    id: doc.id,
    url: doc.url,
    alt: doc.alt,
    mime: doc.mime,
    kind: doc.mime?.startsWith("video/") || doc.kind === "video" ? "video" : "image",
  }));
}

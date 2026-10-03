import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { getImageKit } from "../../integrations/imagekit/imagekit.client";
import { BlogPostModel, OfferModel, PageModel } from "../cms/cms.model";
import { MediaModel, findMediaById, listMedia, toMedia } from "./media.model";
import type { ListMediaFilter, Media } from "./media.model";

const MEDIA_FOLDER = "reservation/media";

export interface UploadMediaInput {
  data: Buffer;
  fileName: string;
  mime: string;
  size: number;
  alt?: string | null;
  caption?: string | null;
  createdBy?: string | null;
}

/** Validate → external store → URL/key → Mongo metadata (docs 08 §41). */
export async function uploadMedia(input: UploadMediaInput): Promise<Media> {
  let result: { url: string; fileId: string; width?: number; height?: number };
  try {
    const uploaded = await getImageKit().upload({
      file: input.data,
      fileName: `${Date.now()}-${input.fileName}`,
      folder: MEDIA_FOLDER,
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
  const doc = await MediaModel.create({
    fileName: input.fileName,
    url: result.url,
    storageKey: result.fileId,
    mime: input.mime,
    width: result.width ?? null,
    height: result.height ?? null,
    alt: input.alt ?? null,
    caption: input.caption ?? null,
    size: input.size,
    createdBy: input.createdBy ?? null,
  });
  return toMedia(doc);
}

export async function updateMediaMeta(
  id: string,
  patch: { alt?: string | null; caption?: string | null },
): Promise<Media> {
  const doc = await MediaModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
        ...(patch.caption !== undefined ? { caption: patch.caption } : {}),
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

import { prisma } from "../../config/database";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { newId } from "../../utils/id";

export type MediaKind = "image" | "video";

/** Binary origin. "ftp" = GoDaddy FTP. "local" / "imagekit" are legacy values from old rows. */
export type StorageProvider = "ftp" | "local" | "imagekit";

export interface Media {
  id: string;
  fileName: string;
  url: string;
  storageKey: string;
  storageProvider: StorageProvider;
  legacyUrl: string | null;
  legacyStorageKey: string | null;
  mime: string;
  kind: MediaKind;
  folder: string | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  alt: string | null;
  caption: string | null;
  size: number;
  position: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MediaDocument = Media & {
  _id: { toString: () => string };
};

export function mediaKindFor(mime: string, kind?: string | null): MediaKind {
  if (kind === "video") return "video";
  return mime.startsWith("video/") ? "video" : "image";
}

export function toMedia(doc: any): Media {
  return {
    id: doc.id ?? doc._id?.toString(),
    fileName: doc.fileName,
    url: doc.url,
    storageKey: doc.storageKey,
    storageProvider: (doc.storageProvider ?? "ftp") as StorageProvider,
    legacyUrl: doc.legacyUrl ?? null,
    legacyStorageKey: doc.legacyStorageKey ?? null,
    mime: doc.mime,
    kind: mediaKindFor(doc.mime, doc.kind),
    folder: doc.folder ?? null,
    width: doc.width ?? null,
    height: doc.height ?? null,
    durationSec: doc.durationSec != null ? Number(doc.durationSec) : null,
    alt: doc.alt ?? null,
    caption: doc.caption ?? null,
    size: Number(doc.size),
    position: doc.position ?? 0,
    createdBy: doc.createdBy ? (doc.createdBy.toString?.() ?? String(doc.createdBy)) : null,
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
  const folders = await prisma.media.findMany({
    where: { folder: { not: null } },
    select: { folder: true },
    distinct: ["folder"],
  });
  return folders
    .map((f) => f.folder)
    .filter((f): f is string => typeof f === "string" && f.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

export async function listMedia(filter: ListMediaFilter): Promise<Paginated<Media>> {
  const where: any = {};
  if (filter.q) {
    where.fileName = { contains: filter.q };
  }
  if (filter.kind) {
    if (filter.kind === "video") {
      where.OR = [{ kind: "video" }, { mime: { startsWith: "video/" } }];
    } else {
      where.kind = "image";
    }
  }
  if (filter.folder !== undefined) {
    if (filter.folder === "__root__") {
      where.folder = null;
    } else if (filter.folder.endsWith("/*")) {
      const prefix = filter.folder.slice(0, -2);
      where.folder = { startsWith: `${prefix}/` };
    } else {
      where.folder = filter.folder;
    }
  }

  const [total, docs] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({
      where,
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    }),
  ]);

  return paginatedResponse(
    docs.map((doc) => toMedia(doc)),
    filter.page,
    filter.limit,
    total,
  );
}

export async function findMediaById(id: string): Promise<Media | null> {
  if (!id || id.length !== 24) return null;
  const doc = await prisma.media.findUnique({ where: { id } });
  return doc ? toMedia(doc) : null;
}

export const MediaModel = {
  create: async (data: any) => {
    const id = newId();
    const created = await prisma.media.create({
      data: {
        id,
        fileName: data.fileName,
        url: data.url,
        storageKey: data.storageKey,
        storageProvider: data.storageProvider ?? "ftp",
        legacyUrl: data.legacyUrl ?? null,
        legacyStorageKey: data.legacyStorageKey ?? null,
        mime: data.mime,
        kind: data.kind ?? "image",
        folder: data.folder ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        durationSec: data.durationSec ?? null,
        alt: data.alt ?? null,
        caption: data.caption ?? null,
        size: Number(data.size),
        position: data.position ?? 0,
        createdBy: data.createdBy ? String(data.createdBy) : null,
      },
    });
    return {
      ...created,
      _id: { toString: () => created.id },
    };
  },
  findByIdAndUpdate: (id: string, update: any, _options?: any) => {
    return {
      exec: async () => {
        try {
          const patch = update.$set ?? update;
          const updated = await prisma.media.update({
            where: { id },
            data: patch,
          });
          return {
            ...updated,
            _id: { toString: () => updated.id },
          };
        } catch {
          return null;
        }
      },
    };
  },
  deleteOne: (query: { _id?: string; id?: string }) => {
    const id = query.id ?? query._id;
    return {
      exec: async () => {
        if (!id) return;
        try {
          await prisma.media.delete({ where: { id } });
        } catch {
          // ignore
        }
      },
    };
  },
  find: (query: { _id?: { $in: string[] } }) => {
    return {
      select: (_fields: string) => ({
        exec: async () => {
          const ids = query._id?.$in ?? [];
          const docs = await prisma.media.findMany({
            where: { id: { in: ids } },
          });
          return docs.map((d) => ({
            ...d,
            _id: { toString: () => d.id },
          }));
        },
      }),
    };
  },
};

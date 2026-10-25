import { prisma } from "../../config/database";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { newId } from "../../utils/id";

export const REVIEW_STATUSES = ["PENDING", "PUBLISHED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review {
  id: string;
  roomTypeId: string | null;
  userId: string | null;
  bookingId: string | null;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  stayDate: string | null;
  isVerified: boolean;
  isAdminCreated: boolean;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = Review & {
  _id: { toString: () => string };
};

export function toReview(doc: any): Review {
  return {
    id: doc.id ?? doc._id?.toString(),
    roomTypeId: doc.roomTypeId ? String(doc.roomTypeId) : null,
    userId: doc.userId ? String(doc.userId) : null,
    bookingId: doc.bookingId ? String(doc.bookingId) : null,
    authorName: doc.authorName,
    rating: doc.rating,
    title: doc.title ?? null,
    body: doc.body,
    stayDate: doc.stayDate ?? null,
    isVerified: Boolean(doc.isVerified),
    isAdminCreated: Boolean(doc.isAdminCreated),
    status: (doc.status as ReviewStatus) ?? "PENDING",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const ReviewModel = {
  create: async (data: any) => {
    const id = newId();
    const created = await prisma.review.create({
      data: {
        id,
        roomTypeId: data.roomTypeId ? String(data.roomTypeId) : null,
        userId: data.userId ? String(data.userId) : null,
        bookingId: data.bookingId ? String(data.bookingId) : null,
        authorName: data.authorName,
        rating: Number(data.rating),
        title: data.title ?? null,
        body: data.body,
        stayDate: data.stayDate ?? null,
        isVerified: Boolean(data.isVerified),
        isAdminCreated: Boolean(data.isAdminCreated),
        status: data.status ?? "PENDING",
      },
    });
    return {
      ...created,
      _id: { toString: () => created.id },
    };
  },
  findOne: (query: Record<string, any>) => {
    return {
      exec: async () => {
        const where: any = {};
        if (query.bookingId) {
          where.bookingId = query.bookingId._id ? String(query.bookingId._id) : String(query.bookingId);
        }
        if (query._id) {
          where.id = String(query._id);
        }
        const found = await prisma.review.findFirst({ where });
        if (!found) return null;
        return {
          ...found,
          _id: { toString: () => found.id },
        };
      },
    };
  },
  findByIdAndUpdate: (id: string, update: { status?: string }, _opts?: any) => {
    return {
      exec: async () => {
        try {
          const updated = await prisma.review.update({
            where: { id },
            data: {
              ...(update.status ? { status: update.status } : {}),
            },
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
};

export async function listReviews(filter: {
  page: number;
  limit: number;
  roomTypeId?: string;
  status?: ReviewStatus;
}): Promise<Paginated<Review>> {
  const where: any = {};
  if (filter.roomTypeId) where.roomTypeId = filter.roomTypeId;
  if (filter.status) where.status = filter.status;

  const [total, docs] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    }),
  ]);
  return paginatedResponse(docs.map(toReview), filter.page, filter.limit, total);
}

export async function reviewSummary(roomTypeId: string): Promise<{ count: number; average: number }> {
  const agg = await prisma.review.aggregate({
    where: { roomTypeId, status: "PUBLISHED" },
    _count: { _all: true },
    _avg: { rating: true },
  });
  const count = agg._count._all;
  const average = agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0;
  return { count, average };
}

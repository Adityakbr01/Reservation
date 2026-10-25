import { prisma } from "../../config/database";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { newId } from "../../utils/id";
import type { ContentStatus, PolicyKey, SeoMeta } from "./cms.types";

export interface CmsDocumentBase {
  id: string;
  _id: { toString: () => string };
  status: ContentStatus;
  version: number;
  publishedAt: Date | null;
  createdBy: string | null;
  previewToken: string | null;
  previewExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<any>;
}

// --- Pages ---

export interface PageSection {
  kind: string;
  heading?: string | null;
  subheading?: string | null;
  html?: string | null;
  imageMediaId?: string | null;
  mediaIds?: string[];
  roomTypeIds?: string[];
  features?: Array<{ title: string; text: string }>;
  entries?: Array<{ quote: string; name: string }>;
  offerId?: string | null;
  category?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export interface PageDocument extends CmsDocumentBase {
  title: string;
  slug: string;
  excerpt: string | null;
  sections: PageSection[];
  featuredImageMediaId: string | null;
  seo: SeoMeta;
}

// --- Blog posts ---

export interface BlogPostDocument extends CmsDocumentBase {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImageMediaId: string | null;
  author: string | null;
  category: string | null;
  tags: string[];
  readingMinutes: number;
  seo: SeoMeta;
}

// --- FAQs ---

export interface FaqDocument extends CmsDocumentBase {
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
}

// --- Offers ---

export interface OfferDocument extends CmsDocumentBase {
  title: string;
  slug: string;
  description: string;
  imageMediaId: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  couponId: string | null;
  seo: SeoMeta;
}

// --- Policy documents ---

export interface PolicyDocument extends CmsDocumentBase {
  key: PolicyKey;
  title: string;
  body: string;
}

export function toSeoMeta(seo: any): SeoMeta {
  return {
    title: seo?.title ?? null,
    description: seo?.description ?? null,
    canonicalUrl: seo?.canonicalUrl ?? null,
    robots: seo?.robots ?? null,
    ogTitle: seo?.ogTitle ?? null,
    ogDescription: seo?.ogDescription ?? null,
    ogImageMediaId: seo?.ogImageMediaId ? String(seo.ogImageMediaId) : null,
  };
}

export interface CmsListFilter {
  page: number;
  limit: number;
  status?: ContentStatus;
  q?: string;
}

function mongoQueryToPrismaWhere(query: Record<string, any>): any {
  if (!query || typeof query !== "object") return {};
  const where: any = {};
  for (const [key, val] of Object.entries(query)) {
    if (key === "$or" && Array.isArray(val)) {
      where.OR = val.map((sub) => mongoQueryToPrismaWhere(sub));
    } else if (key === "$and" && Array.isArray(val)) {
      where.AND = val.map((sub) => mongoQueryToPrismaWhere(sub));
    } else if (key === "$not" && typeof val === "object") {
      where.NOT = mongoQueryToPrismaWhere(val);
    } else if (key === "_id") {
      if (val && typeof val === "object" && "$in" in val) {
        where.id = { in: (val as any).$in };
      } else {
        where.id = String(val);
      }
    } else if (val && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
      const fieldCond: any = {};
      let hasOp = false;
      if ("$regex" in val) {
        fieldCond.contains = (val as any).$regex;
        hasOp = true;
      }
      if ("$in" in val) {
        fieldCond.in = (val as any).$in;
        hasOp = true;
      }
      if ("$nin" in val) {
        fieldCond.notIn = (val as any).$nin;
        hasOp = true;
      }
      if ("$gt" in val) {
        fieldCond.gt = (val as any).$gt;
        hasOp = true;
      }
      if ("$gte" in val) {
        fieldCond.gte = (val as any).$gte;
        hasOp = true;
      }
      if ("$lt" in val) {
        fieldCond.lt = (val as any).$lt;
        hasOp = true;
      }
      if ("$lte" in val) {
        fieldCond.lte = (val as any).$lte;
        hasOp = true;
      }
      if ("$ne" in val) {
        fieldCond.not = (val as any).$ne;
        hasOp = true;
      }
      if (hasOp) {
        where[key] = fieldCond;
      } else {
        where[key] = val;
      }
    } else {
      where[key] = val;
    }
  }
  return where;
}

function cleanPrismaData(obj: any): Record<string, any> {
  if (!obj || typeof obj !== "object") return {};
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!k.startsWith("$")) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

function mongoSortToPrismaOrderBy(sort: Record<string, 1 | -1>): any {
  const orderBy: any[] = [];
  for (const [key, dir] of Object.entries(sort)) {
    orderBy.push({ [key]: dir === 1 ? "asc" : "desc" });
  }
  return orderBy.length === 1 ? orderBy[0] : orderBy.length > 0 ? orderBy : undefined;
}

function wrapCmsDoc(row: any, delegate: any): any {
  return {
    ...row,
    _id: { toString: () => row.id },
    save: async function () {
      const { id, _id, save, createdAt, updatedAt, ...rest } = this;
      const updated = await delegate.update({
        where: { id: row.id },
        data: cleanPrismaData(rest),
      });
      Object.assign(this, updated);
      return this;
    },
  };
}

export interface CmsModel<TDoc> {
  create: (data: any) => Promise<TDoc>;
  findById: (id: string) => { exec: () => Promise<TDoc | null> };
  findOne: (query: Record<string, any>) => { exec: () => Promise<TDoc | null> };
  find: (query?: Record<string, any>) => {
    sort: (s: Record<string, 1 | -1>) => any;
    skip: (n: number) => any;
    limit: (n: number) => any;
    select: (f: string) => any;
    exec: () => Promise<TDoc[]>;
  };
  countDocuments: (query?: Record<string, any>) => { exec: () => Promise<number> };
  findOneAndUpdate: (query: Record<string, any>, update: any, options?: any) => { exec: () => Promise<TDoc | null> };
  findByIdAndUpdate: (id: string, update: any, options?: any) => { exec: () => Promise<TDoc | null> };
  deleteOne: (query: Record<string, any>) => { exec: () => Promise<void> };
  updateOne: (query: Record<string, any>, update: any, options?: any) => Promise<void> & { exec: () => Promise<void> };
}

function createCmsModelWrapper<TDoc>(delegate: any): CmsModel<TDoc> {
  return {
    create: async (data: any): Promise<TDoc> => {
      const id = newId();
      const row = await delegate.create({
        data: {
          id,
          ...cleanPrismaData(data),
        },
      });
      return wrapCmsDoc(row, delegate) as TDoc;
    },
    findById: (id: string) => ({
      exec: async (): Promise<TDoc | null> => {
        if (!id || id.length !== 24) return null;
        const row = await delegate.findUnique({ where: { id } });
        return row ? (wrapCmsDoc(row, delegate) as TDoc) : null;
      },
    }),
    findOne: (query: Record<string, any>) => ({
      exec: async (): Promise<TDoc | null> => {
        const where = mongoQueryToPrismaWhere(query);
        const row = await delegate.findFirst({ where });
        return row ? (wrapCmsDoc(row, delegate) as TDoc) : null;
      },
    }),
    find: (query: Record<string, any> = {}) => {
      const where = mongoQueryToPrismaWhere(query);
      let orderBy: any = undefined;
      let skip: number | undefined = undefined;
      let take: number | undefined = undefined;
      let select: any = undefined;

      const chain = {
        sort: (s: Record<string, 1 | -1>) => {
          orderBy = mongoSortToPrismaOrderBy(s);
          return chain;
        },
        skip: (n: number) => {
          skip = n;
          return chain;
        },
        limit: (n: number) => {
          take = n;
          return chain;
        },
        select: (fieldsStr: string) => {
          select = {};
          for (const f of fieldsStr.split(" ")) {
            if (f.trim()) select[f.trim()] = true;
          }
          return chain;
        },
        exec: async (): Promise<TDoc[]> => {
          const rows = await delegate.findMany({
            where,
            orderBy,
            skip,
            take,
            select,
          });
          return rows.map((r: any) => wrapCmsDoc(r, delegate) as TDoc);
        },
      };
      return chain;
    },
    countDocuments: (query: Record<string, any> = {}) => ({
      exec: async (): Promise<number> => {
        const where = mongoQueryToPrismaWhere(query);
        return delegate.count({ where });
      },
    }),
    findOneAndUpdate: (query: Record<string, any>, update: any, options: any = {}) => ({
      exec: async (): Promise<TDoc | null> => {
        const where = mongoQueryToPrismaWhere(query);
        const existing = await delegate.findFirst({ where });
        if (!existing) {
          if (options.upsert) {
            const patch = {
              ...cleanPrismaData(update.$setOnInsert),
              ...cleanPrismaData(update.$set ?? update),
            };
            const created = await delegate.create({
              data: {
                id: newId(),
                ...patch,
              },
            });
            return wrapCmsDoc(created, delegate) as TDoc;
          }
          return null;
        }
        const patch = cleanPrismaData(update.$set ?? update);
        const inc = update.$inc;
        const data: any = { ...patch };
        if (inc) {
          for (const [k, v] of Object.entries(inc)) {
            data[k] = { increment: v };
          }
        }
        const updated = await delegate.update({
          where: { id: existing.id },
          data,
        });
        return wrapCmsDoc(updated, delegate) as TDoc;
      },
    }),
    findByIdAndUpdate: (id: string, update: any, _options: any = {}) => ({
      exec: async (): Promise<TDoc | null> => {
        if (!id || id.length !== 24) return null;
        try {
          const patch = cleanPrismaData(update.$set ?? update);
          const inc = update.$inc;
          const data: any = { ...patch };
          if (inc) {
            for (const [k, v] of Object.entries(inc)) {
              data[k] = { increment: v };
            }
          }
          const updated = await delegate.update({
            where: { id },
            data,
          });
          return wrapCmsDoc(updated, delegate) as TDoc;
        } catch {
          return null;
        }
      },
    }),
    deleteOne: (query: Record<string, any>) => ({
      exec: async (): Promise<void> => {
        const where = mongoQueryToPrismaWhere(query);
        const existing = await delegate.findFirst({ where });
        if (existing) {
          await delegate.delete({ where: { id: existing.id } });
        }
      },
    }),
    updateOne: (query: Record<string, any>, update: any, options: any = {}) => {
      const op = async (): Promise<void> => {
        const where = mongoQueryToPrismaWhere(query);
        const existing = await delegate.findFirst({ where });
        if (!existing) {
          if (options?.upsert) {
            const patch = {
              ...cleanPrismaData(update.$setOnInsert),
              ...cleanPrismaData(update.$set ?? update),
            };
            await delegate.create({
              data: {
                id: newId(),
                ...patch,
              },
            });
          }
          return;
        }
        const patch = cleanPrismaData(update.$set ?? (update.$setOnInsert ? null : update));
        if (patch && Object.keys(patch).length > 0) {
          await delegate.update({
            where: { id: existing.id },
            data: patch,
          });
        }
      };
      const promise = op();
      return Object.assign(promise, { exec: () => promise });
    },
  };
}

export const PageModel = createCmsModelWrapper<PageDocument>(prisma.cmsPage);
export const BlogPostModel = createCmsModelWrapper<BlogPostDocument>(prisma.cmsBlogPost);
export const FaqModel = createCmsModelWrapper<FaqDocument>(prisma.cmsFaq);
export const OfferModel = createCmsModelWrapper<OfferDocument>(prisma.cmsOffer);
export const PolicyDocModel = createCmsModelWrapper<PolicyDocument>(prisma.cmsPolicyDoc);

export function textSearch(query: Record<string, any>, q: string, fields: string[]) {
  query.$or = fields.map((field) => ({ [field]: { $regex: q, $options: "i" } }));
}

export async function paginateModel<TDoc, TOut>(
  model: CmsModel<TDoc>,
  query: any,
  filter: CmsListFilter,
  sort: Record<string, 1 | -1>,
  map: (doc: TDoc) => TOut,
): Promise<Paginated<TOut>> {
  const [total, docs] = await Promise.all([
    model.countDocuments(query).exec(),
    model
      .find(query)
      .sort(sort)
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map(map),
    filter.page,
    filter.limit,
    total,
  );
}

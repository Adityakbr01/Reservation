import { randomBytes } from "node:crypto";
import { prisma } from "../../config/database";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { newId } from "../../utils/id";

export const NEWSLETTER_STATUSES = ["SUBSCRIBED", "UNSUBSCRIBED"] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  status: NewsletterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NewsletterDocument = NewsletterSubscriber & {
  normalizedEmail: string;
  unsubscribeToken: string;
  _id: { toString: () => string };
  save: () => Promise<any>;
};

export function toSubscriber(doc: any): NewsletterSubscriber {
  return {
    id: doc.id ?? doc._id?.toString(),
    email: doc.email,
    name: doc.name ?? null,
    source: doc.source ?? null,
    status: (doc.status as NewsletterStatus) ?? "SUBSCRIBED",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function wrapSubscriberDoc(row: any): NewsletterDocument {
  return {
    ...row,
    _id: { toString: () => row.id },
    save: async function () {
      const updated = await prisma.newsletterSubscriber.update({
        where: { id: row.id },
        data: {
          name: this.name,
          status: this.status,
          source: this.source,
          email: this.email,
        },
      });
      Object.assign(this, updated);
      return this;
    },
  };
}

export const NewsletterModel = {
  findOne: (query: { normalizedEmail?: string; unsubscribeToken?: string }) => ({
    exec: async () => {
      const where: any = {};
      if (query.normalizedEmail) where.normalizedEmail = query.normalizedEmail;
      if (query.unsubscribeToken) where.unsubscribeToken = query.unsubscribeToken;
      const doc = await prisma.newsletterSubscriber.findFirst({ where });
      return doc ? wrapSubscriberDoc(doc) : null;
    },
  }),
  create: async (data: any) => {
    const id = newId();
    const doc = await prisma.newsletterSubscriber.create({
      data: {
        id,
        email: data.email,
        normalizedEmail: data.normalizedEmail,
        name: data.name ?? null,
        source: data.source ?? "website",
        status: data.status ?? "SUBSCRIBED",
        unsubscribeToken: data.unsubscribeToken ?? randomBytes(16).toString("hex"),
      },
    });
    return wrapSubscriberDoc(doc);
  },
  deleteOne: (query: { _id?: string; id?: string }) => ({
    exec: async () => {
      const id = query.id ?? query._id;
      if (!id) return;
      try {
        await prisma.newsletterSubscriber.delete({ where: { id } });
      } catch {
        // ignore
      }
    },
  }),
};

export async function listSubscribers(filter: {
  page: number;
  limit: number;
  q?: string;
  status?: NewsletterStatus;
}): Promise<Paginated<NewsletterSubscriber>> {
  const where: any = {};
  if (filter.status) where.status = filter.status;
  if (filter.q) where.email = { contains: filter.q };
  const [total, docs] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    }),
  ]);
  return paginatedResponse(docs.map(toSubscriber), filter.page, filter.limit, total);
}

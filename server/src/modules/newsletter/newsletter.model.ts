import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

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

export interface NewsletterDocument extends mongoose.Document {
  email: string;
  normalizedEmail: string;
  name: string | null;
  source: string | null;
  status: NewsletterStatus;
  unsubscribeToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new mongoose.Schema<NewsletterDocument>(
  {
    email: { type: String, required: true, trim: true, maxlength: 160 },
    normalizedEmail: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, default: null, maxlength: 120 },
    source: { type: String, default: null, maxlength: 40 },
    status: { type: String, enum: NEWSLETTER_STATUSES, default: "SUBSCRIBED", required: true },
    unsubscribeToken: { type: String, required: true, default: () => randomBytes(16).toString("hex") },
  },
  { timestamps: true },
);

newsletterSchema.index({ status: 1, createdAt: -1 });

export const NewsletterModel =
  mongoose.models.NewsletterSubscriber ?? mongoose.model<NewsletterDocument>("NewsletterSubscriber", newsletterSchema);

export function toSubscriber(doc: NewsletterDocument): NewsletterSubscriber {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    source: doc.source,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listSubscribers(filter: { page: number; limit: number; q?: string; status?: NewsletterStatus }): Promise<Paginated<NewsletterSubscriber>> {
  const query: QueryFilter<NewsletterDocument> = {};
  if (filter.status) query.status = filter.status;
  if (filter.q) query.email = { $regex: filter.q, $options: "i" };
  const [total, docs] = await Promise.all([
    NewsletterModel.countDocuments(query).exec(),
    NewsletterModel.find(query).sort({ createdAt: -1 }).skip((filter.page - 1) * filter.limit).limit(filter.limit).exec(),
  ]);
  return paginatedResponse(docs.map(toSubscriber), filter.page, filter.limit, total);
}

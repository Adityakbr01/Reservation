import mongoose from "mongoose";

export interface WhyBookItem {
  title: string;
  text?: string | null;
}

export interface SiteSettings {
  id: string;
  propertyName: string;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  phone: string | null;
  supportEmail: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  /** Hours before check-in the reminder sweep fires (docs 06 §41). */
  reminderHoursBefore: number;
  social: {
    facebook: string | null;
    instagram: string | null;
    x: string | null;
  };
  defaultSeo: {
    title: string | null;
    description: string | null;
    ogImageMediaId: string | null;
  };
  /** "Why book with us?" trust badges shown on detail pages. */
  whyBookWithUs: WhyBookItem[];
  updatedAt: Date;
}

export interface SiteSettingsDocument extends mongoose.Document {
  key: string;
  propertyName: string;
  logoMediaId: mongoose.Types.ObjectId | null;
  faviconMediaId: mongoose.Types.ObjectId | null;
  phone: string | null;
  supportEmail: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  reminderHoursBefore: number;
  social: {
    facebook: string | null;
    instagram: string | null;
    x: string | null;
  };
  defaultSeo: {
    title: string | null;
    description: string | null;
    ogImageMediaId: mongoose.Types.ObjectId | null;
  };
  whyBookWithUs: WhyBookItem[];
  updatedAt: Date;
}

const settingsSchema = new mongoose.Schema<SiteSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    propertyName: { type: String, default: "Reservation", maxlength: 120 },
    logoMediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      default: null,
    },
    faviconMediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      default: null,
    },
    phone: { type: String, default: null, maxlength: 40 },
    supportEmail: { type: String, default: null, maxlength: 160 },
    address: { type: String, default: null, maxlength: 300 },
    timezone: { type: String, default: "Asia/Kolkata", maxlength: 60 },
    currency: { type: String, default: "INR", maxlength: 3 },
    checkInTime: { type: String, default: null, maxlength: 5 },
    checkOutTime: { type: String, default: null, maxlength: 5 },
    reminderHoursBefore: { type: Number, default: 24, min: 1, max: 72 },
    social: {
      facebook: { type: String, default: null, maxlength: 300 },
      instagram: { type: String, default: null, maxlength: 300 },
      x: { type: String, default: null, maxlength: 300 },
    },
    defaultSeo: {
      title: { type: String, default: null, maxlength: 160 },
      description: { type: String, default: null, maxlength: 300 },
      ogImageMediaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
        default: null,
      },
    },
    whyBookWithUs: {
      type: [
        {
          title: { type: String, required: true, maxlength: 120 },
          text: { type: String, default: null, maxlength: 5000 },
        },
      ],
      default: [
        { title: "Local knowledge", text: null },
        { title: "Property", text: null },
        { title: "Quality checked", text: null },
        { title: "Customer Satisfaction", text: null },
        { title: "24/7 support", text: null },
      ],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

// Guarded for --hot reloads.
export const SiteSettingsModel =
  mongoose.models.SiteSettings ??
  mongoose.model<SiteSettingsDocument>("SiteSettings", settingsSchema);

export function toSiteSettings(doc: SiteSettingsDocument): SiteSettings {
  return {
    id: doc._id.toString(),
    propertyName: doc.propertyName,
    logoMediaId: doc.logoMediaId ? doc.logoMediaId.toString() : null,
    faviconMediaId: doc.faviconMediaId ? doc.faviconMediaId.toString() : null,
    phone: doc.phone,
    supportEmail: doc.supportEmail,
    address: doc.address,
    timezone: doc.timezone,
    currency: doc.currency,
    checkInTime: doc.checkInTime,
    checkOutTime: doc.checkOutTime,
    reminderHoursBefore: doc.reminderHoursBefore ?? 24,
    social: { ...doc.social },
    defaultSeo: {
      title: doc.defaultSeo?.title ?? null,
      description: doc.defaultSeo?.description ?? null,
      ogImageMediaId: doc.defaultSeo?.ogImageMediaId
        ? doc.defaultSeo.ogImageMediaId.toString()
        : null,
    },
    whyBookWithUs: (doc.whyBookWithUs ?? []).map((w) => ({
      title: w.title,
      text: w.text ?? null,
    })),
    updatedAt: doc.updatedAt,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const doc =
    (await SiteSettingsModel.findOne({ key: "site" }).exec()) ??
    (await SiteSettingsModel.create({ key: "site" }));
  return toSiteSettings(doc);
}

export async function updateSiteSettings(patch: {
  propertyName?: string;
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
  phone?: string | null;
  supportEmail?: string | null;
  address?: string | null;
  timezone?: string;
  currency?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  reminderHoursBefore?: number;
  social?: {
    facebook?: string | null;
    instagram?: string | null;
    x?: string | null;
  };
  defaultSeo?: {
    title?: string | null;
    description?: string | null;
    ogImageMediaId?: string | null;
  };
  whyBookWithUs?: WhyBookItem[];
}): Promise<SiteSettings> {
  // Why-book bodies are rich HTML from CKEditor — sanitize like CMS content.
  const { sanitizeRichText } = await import("../cms/cms.types");
  const safePatch = {
    ...patch,
    ...(patch.whyBookWithUs
      ? {
          whyBookWithUs: patch.whyBookWithUs.map((item) => ({
            title: item.title,
            text: item.text ? sanitizeRichText(item.text) || null : null,
          })),
        }
      : {}),
  };
  const doc = await SiteSettingsModel.findOneAndUpdate(
    { key: "site" },
    { $set: safePatch },
    { returnDocument: "after", upsert: true },
  ).exec();
  if (!doc) throw new Error("Site settings update failed");
  return toSiteSettings(doc);
}

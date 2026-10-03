import mongoose from "mongoose";

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
  social: { facebook: string | null; instagram: string | null; x: string | null };
  defaultSeo: {
    title: string | null;
    description: string | null;
    ogImageMediaId: string | null;
  };
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
  social: { facebook: string | null; instagram: string | null; x: string | null };
  defaultSeo: { title: string | null; description: string | null; ogImageMediaId: mongoose.Types.ObjectId | null };
  updatedAt: Date;
}

const settingsSchema = new mongoose.Schema<SiteSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    propertyName: { type: String, default: "Reservation", maxlength: 120 },
    logoMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },
    faviconMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },
    phone: { type: String, default: null, maxlength: 40 },
    supportEmail: { type: String, default: null, maxlength: 160 },
    address: { type: String, default: null, maxlength: 300 },
    timezone: { type: String, default: "Asia/Kolkata", maxlength: 60 },
    currency: { type: String, default: "INR", maxlength: 3 },
    checkInTime: { type: String, default: null, maxlength: 5 },
    checkOutTime: { type: String, default: null, maxlength: 5 },
    social: {
      facebook: { type: String, default: null, maxlength: 300 },
      instagram: { type: String, default: null, maxlength: 300 },
      x: { type: String, default: null, maxlength: 300 },
    },
    defaultSeo: {
      title: { type: String, default: null, maxlength: 160 },
      description: { type: String, default: null, maxlength: 300 },
      ogImageMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },
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
    social: { ...doc.social },
    defaultSeo: {
      title: doc.defaultSeo?.title ?? null,
      description: doc.defaultSeo?.description ?? null,
      ogImageMediaId: doc.defaultSeo?.ogImageMediaId ? doc.defaultSeo.ogImageMediaId.toString() : null,
    },
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
  social?: { facebook?: string | null; instagram?: string | null; x?: string | null };
  defaultSeo?: { title?: string | null; description?: string | null; ogImageMediaId?: string | null };
}): Promise<SiteSettings> {
  const doc = await SiteSettingsModel.findOneAndUpdate(
    { key: "site" },
    { $set: patch },
    { returnDocument: "after", upsert: true },
  ).exec();
  if (!doc) throw new Error("Site settings update failed");
  return toSiteSettings(doc);
}

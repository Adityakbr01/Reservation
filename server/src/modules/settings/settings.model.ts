import { prisma } from "../../config/database";
import { newId } from "../../utils/id";

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

export type SiteSettingsDocument = SiteSettings & {
  _id: { toString: () => string };
};

export function toSiteSettings(doc: any): SiteSettings {
  const social = (doc.social ?? {}) as Record<string, any>;
  const defaultSeo = (doc.defaultSeo ?? {}) as Record<string, any>;
  const whyBook = (doc.whyBookWithUs ?? []) as any[];

  return {
    id: doc.id ?? doc._id?.toString(),
    propertyName: doc.propertyName,
    logoMediaId: doc.logoMediaId ? String(doc.logoMediaId) : null,
    faviconMediaId: doc.faviconMediaId ? String(doc.faviconMediaId) : null,
    phone: doc.phone ?? null,
    supportEmail: doc.supportEmail ?? null,
    address: doc.address ?? null,
    timezone: doc.timezone ?? "Asia/Kolkata",
    currency: doc.currency ?? "INR",
    checkInTime: doc.checkInTime ?? null,
    checkOutTime: doc.checkOutTime ?? null,
    reminderHoursBefore: doc.reminderHoursBefore ?? 24,
    social: {
      facebook: social.facebook ?? null,
      instagram: social.instagram ?? null,
      x: social.x ?? null,
    },
    defaultSeo: {
      title: defaultSeo.title ?? null,
      description: defaultSeo.description ?? null,
      ogImageMediaId: defaultSeo.ogImageMediaId ? String(defaultSeo.ogImageMediaId) : null,
    },
    whyBookWithUs: whyBook.map((w) => ({
      title: w.title,
      text: w.text ?? null,
    })),
    updatedAt: doc.updatedAt,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  let doc = await prisma.siteSettings.findUnique({ where: { key: "site" } });
  if (!doc) {
    doc = await prisma.siteSettings.create({
      data: {
        id: newId(),
        key: "site",
        propertyName: "Reservation",
        timezone: "Asia/Kolkata",
        currency: "INR",
        reminderHoursBefore: 24,
        social: { facebook: null, instagram: null, x: null },
        defaultSeo: { title: null, description: null, ogImageMediaId: null },
        whyBookWithUs: [
          { title: "Local knowledge", text: null },
          { title: "Property", text: null },
          { title: "Quality checked", text: null },
          { title: "Customer Satisfaction", text: null },
          { title: "24/7 support", text: null },
        ],
      },
    });
  }
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
  const { sanitizeRichText } = await import("../cms/cms.types");
  const data: any = {};
  if (patch.propertyName !== undefined) data.propertyName = patch.propertyName;
  if (patch.logoMediaId !== undefined) data.logoMediaId = patch.logoMediaId;
  if (patch.faviconMediaId !== undefined) data.faviconMediaId = patch.faviconMediaId;
  if (patch.phone !== undefined) data.phone = patch.phone;
  if (patch.supportEmail !== undefined) data.supportEmail = patch.supportEmail;
  if (patch.address !== undefined) data.address = patch.address;
  if (patch.timezone !== undefined) data.timezone = patch.timezone;
  if (patch.currency !== undefined) data.currency = patch.currency;
  if (patch.checkInTime !== undefined) data.checkInTime = patch.checkInTime;
  if (patch.checkOutTime !== undefined) data.checkOutTime = patch.checkOutTime;
  if (patch.reminderHoursBefore !== undefined) data.reminderHoursBefore = patch.reminderHoursBefore;
  if (patch.social !== undefined) data.social = patch.social;
  if (patch.defaultSeo !== undefined) data.defaultSeo = patch.defaultSeo;
  if (patch.whyBookWithUs !== undefined) {
    data.whyBookWithUs = patch.whyBookWithUs.map((item) => ({
      title: item.title,
      text: item.text ? sanitizeRichText(item.text) || null : null,
    }));
  }

  const doc = await prisma.siteSettings.upsert({
    where: { key: "site" },
    create: {
      id: newId(),
      key: "site",
      ...data,
    },
    update: data,
  });

  return toSiteSettings(doc);
}

export const SiteSettingsModel = {
  findOne: (query: { key?: string }) => ({
    exec: async () => {
      const doc = await prisma.siteSettings.findUnique({ where: { key: query.key ?? "site" } });
      if (!doc) return null;
      return { ...doc, _id: { toString: () => doc.id } };
    },
  }),
  create: async (data: any) => {
    const doc = await prisma.siteSettings.create({
      data: {
        id: newId(),
        key: data.key ?? "site",
        ...data,
      },
    });
    return { ...doc, _id: { toString: () => doc.id } };
  },
  updateOne: (query: { key?: string }, update: any, _options?: any) => {
    const op = async (): Promise<void> => {
      const patch = update.$set ?? update;
      await prisma.siteSettings.upsert({
        where: { key: query.key ?? "site" },
        create: {
          id: newId(),
          key: query.key ?? "site",
          ...patch,
        },
        update: patch,
      });
    };
    const promise = op();
    return Object.assign(promise, { exec: () => promise });
  },
};

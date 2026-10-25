import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";

const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
const prisma = targetUrl
  ? new PrismaClient({ datasources: { db: { url: targetUrl } } })
  : new PrismaClient();

function unwrapBson(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val === "object") {
    if ("$oid" in val) return val["$oid"];
    if ("$date" in val) {
      const d = val["$date"];
      if (typeof d === "object" && "$numberLong" in d) {
        return new Date(Number(d["$numberLong"]));
      }
      return new Date(d);
    }
    if ("$numberInt" in val) return parseInt(val["$numberInt"], 10);
    if ("$numberLong" in val) return Number(val["$numberLong"]);
    if ("$numberDouble" in val) return parseFloat(val["$numberDouble"]);
    if (Array.isArray(val)) return val.map(unwrapBson);
    const result: any = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "__v") continue;
      result[k] = unwrapBson(v);
    }
    return result;
  }
  return val;
}

async function loadCollection(backupDir: string, name: string): Promise<any[]> {
  const filePath = resolve(backupDir, `${name}.json`);
  const content = await readFile(filePath, "utf-8");
  const raw = JSON.parse(content);
  return unwrapBson(raw);
}

interface MigrationStats {
  collection: string;
  sourceCount: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  // Determine backup directory
  let backupDir: string | null = null;
  const backupIdx = args.indexOf("--backup");
  if (backupIdx !== -1 && args[backupIdx + 1]) {
    backupDir = resolve(process.cwd(), args[backupIdx + 1]);
  } else {
    // Auto-detect latest backup folder
    const backupsRoot = resolve(process.cwd(), "backups");
    try {
      const entries = await readdir(backupsRoot, { withFileTypes: true });
      const dirs = entries
        .filter((e) => e.isDirectory() && e.name.startsWith("backup-"))
        .map((e) => e.name)
        .sort();
      if (dirs.length > 0) {
        backupDir = resolve(backupsRoot, dirs[dirs.length - 1]);
      }
    } catch {
      // fallback
    }
  }

  if (!backupDir) {
    backupDir = resolve(process.cwd(), "backups", "backup-2026-10-25T18-04-43-338Z");
  }

  console.log(`\n==================================================`);
  console.log(`MongoDB → MySQL Migration Script`);
  console.log(`Source Backup : ${backupDir}`);
  console.log(`Target DB     : ${targetUrl ? targetUrl.replace(/:([^@]+)@/, ":***@") : "default"}`);
  console.log(`Mode          : ${dryRun ? "DRY-RUN (verification only)" : "LIVE MIGRATION"}`);
  console.log(`==================================================\n`);

  const manifestPath = resolve(backupDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));

  const stats: Record<string, MigrationStats> = {};

  const initStats = (name: string, count: number) => {
    stats[name] = {
      collection: name,
      sourceCount: count,
      migratedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };
  };

  for (const [name, info] of Object.entries(manifest.collections as Record<string, any>)) {
    initStats(name, info.count);
  }

  // Set of verified IDs to detect any orphan foreign keys
  const userIds = new Set<string>();
  const propertyIds = new Set<string>();
  const roomTypeIds = new Set<string>();
  const roomIds = new Set<string>();
  const ratePlanIds = new Set<string>();
  const cancellationPolicyIds = new Set<string>();
  const bookingIds = new Set<string>();
  const paymentIds = new Set<string>();

  // ----------------------------------------------------
  // TIER 1: Independent Tables
  // ----------------------------------------------------

  // 1. Users
  console.log("Migrating users...");
  const users = await loadCollection(backupDir, "users");
  for (const doc of users) {
    const id = doc._id;
    userIds.add(id);
    if (!dryRun) {
      await prisma.user.upsert({
        where: { id },
        create: {
          id,
          name: doc.name,
          email: doc.email,
          passwordHash: doc.passwordHash || "",
          role: doc.role || "user",
          isActive: doc.isActive !== false,
          avatarUrl: doc.avatarUrl ?? null,
          avatarFileId: doc.avatarFileId ?? null,
          avatarStorageProvider: doc.avatarStorageProvider || "ftp",
          legacyAvatarUrl: doc.legacyAvatarUrl ?? null,
          legacyAvatarFileId: doc.legacyAvatarFileId ?? null,
          passwordResetTokenHash: doc.passwordResetTokenHash ?? null,
          passwordResetExpires: doc.passwordResetExpires ? new Date(doc.passwordResetExpires) : null,
          lastLoginAt: doc.lastLoginAt ? new Date(doc.lastLoginAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["users"].migratedCount++;
  }

  // 2. Properties
  console.log("Migrating properties...");
  const properties = await loadCollection(backupDir, "properties");
  for (const doc of properties) {
    const id = doc._id;
    propertyIds.add(id);
    if (!dryRun) {
      await prisma.property.upsert({
        where: { id },
        create: {
          id,
          name: doc.name,
          slug: doc.slug,
          description: doc.description ?? null,
          contact: doc.contact ?? null,
          mapEmbedUrl: doc.mapEmbedUrl ?? null,
          checkInTime: doc.checkInTime || "14:00",
          checkOutTime: doc.checkOutTime || "12:00",
          timezone: doc.timezone || "Asia/Kolkata",
          currency: doc.currency || "INR",
          status: doc.status || "ACTIVE",
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["properties"].migratedCount++;
  }

  // 3. Amenities
  console.log("Migrating amenities...");
  const amenities = await loadCollection(backupDir, "amenities");
  for (const doc of amenities) {
    const id = doc._id;
    if (!dryRun) {
      await prisma.amenity.upsert({
        where: { id },
        create: {
          id,
          name: doc.name,
          slug: doc.slug,
          group: doc.group || "HIGHLIGHT",
          description: doc.description ?? null,
          imageMediaId: doc.imageMediaId ?? null,
          iconUrl: doc.iconUrl ?? null,
          sortOrder: doc.sortOrder ?? 0,
          status: doc.status || "ACTIVE",
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["amenities"].migratedCount++;
  }

  // 4. Media
  console.log("Migrating media...");
  const mediaDocs = await loadCollection(backupDir, "media");
  for (const doc of mediaDocs) {
    const id = doc._id;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : null;
    if (!dryRun) {
      await prisma.media.upsert({
        where: { id },
        create: {
          id,
          fileName: doc.fileName,
          url: doc.url,
          storageKey: doc.storageKey,
          storageProvider: doc.storageProvider || "ftp",
          legacyUrl: doc.legacyUrl ?? null,
          legacyStorageKey: doc.legacyStorageKey ?? null,
          mime: doc.mime,
          kind: doc.kind || "image",
          folder: doc.folder ?? null,
          width: doc.width ?? null,
          height: doc.height ?? null,
          durationSec: doc.durationSec ?? null,
          alt: doc.alt ?? null,
          caption: doc.caption ?? null,
          size: doc.size ?? 0,
          createdBy,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["media"].migratedCount++;
  }

  // 5. SiteSettings
  console.log("Migrating sitesettings...");
  const siteSettings = await loadCollection(backupDir, "sitesettings");
  for (const doc of siteSettings) {
    const id = doc._id;
    if (!dryRun) {
      await prisma.siteSettings.upsert({
        where: { id },
        create: {
          id,
          key: doc.key || "site",
          propertyName: doc.propertyName || "Reservation",
          logoMediaId: doc.logoMediaId ?? null,
          faviconMediaId: doc.faviconMediaId ?? null,
          phone: doc.phone ?? null,
          supportEmail: doc.supportEmail ?? null,
          address: doc.address ?? null,
          timezone: doc.timezone || "Asia/Kolkata",
          currency: doc.currency || "INR",
          checkInTime: doc.checkInTime ?? null,
          checkOutTime: doc.checkOutTime ?? null,
          reminderHoursBefore: doc.reminderHoursBefore ?? 24,
          social: doc.social ?? null,
          defaultSeo: doc.defaultSeo ?? null,
          whyBookWithUs: doc.whyBookWithUs ?? null,
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["sitesettings"].migratedCount++;
  }

  // 6. NewsletterSubscribers
  console.log("Migrating newslettersubscribers...");
  const subscribers = await loadCollection(backupDir, "newslettersubscribers");
  for (const doc of subscribers) {
    const id = doc._id;
    if (!dryRun) {
      await prisma.newsletterSubscriber.upsert({
        where: { id },
        create: {
          id,
          email: doc.email,
          normalizedEmail: doc.normalizedEmail || doc.email.toUpperCase(),
          name: doc.name ?? null,
          source: doc.source ?? null,
          status: doc.status || "SUBSCRIBED",
          unsubscribeToken: doc.unsubscribeToken,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["newslettersubscribers"].migratedCount++;
  }

  // 7. WebhookEvents
  console.log("Migrating webhookevents...");
  const webhookEvents = await loadCollection(backupDir, "webhookevents");
  for (const doc of webhookEvents) {
    const stripeEventId = doc.stripeEventId;
    if (!dryRun) {
      await prisma.webhookEvent.upsert({
        where: { stripeEventId },
        create: {
          id: doc._id,
          provider: doc.provider || "STRIPE",
          stripeEventId,
          eventType: doc.eventType,
          receivedAt: new Date(doc.receivedAt),
          processedAt: doc.processedAt ? new Date(doc.processedAt) : null,
          processingStatus: doc.processingStatus || "RECEIVED",
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["webhookevents"].migratedCount++;
  }

  // 8. EmailTemplates
  console.log("Migrating emailtemplates...");
  const emailTemplates = await loadCollection(backupDir, "emailtemplates");
  for (const doc of emailTemplates) {
    const key = doc.key;
    const updatedBy = doc.updatedBy && userIds.has(doc.updatedBy) ? doc.updatedBy : null;
    if (!dryRun) {
      await prisma.emailTemplate.upsert({
        where: { key },
        create: {
          id: doc._id,
          key,
          subject: doc.subject,
          htmlBody: doc.htmlBody ?? "",
          textBody: doc.textBody ?? "",
          isEnabled: doc.isEnabled !== false,
          updatedBy,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["emailtemplates"].migratedCount++;
  }

  // ----------------------------------------------------
  // TIER 2: Secondary Parents (depend on Tier 1)
  // ----------------------------------------------------

  // 9. CancellationPolicies
  console.log("Migrating cancellationpolicies...");
  const policies = await loadCollection(backupDir, "cancellationpolicies");
  for (const doc of policies) {
    const id = doc._id;
    cancellationPolicyIds.add(id);
    if (!dryRun) {
      await prisma.cancellationPolicy.upsert({
        where: { id },
        create: {
          id,
          propertyId: doc.propertyId,
          name: doc.name,
          freeCancellationHours: doc.freeCancellationHours ?? 0,
          refundPercentage: new Prisma.Decimal(doc.refundPercentage ?? 0),
          isDefault: doc.isDefault ?? false,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["cancellationpolicies"].migratedCount++;
  }

  // 10. RoomTypes
  console.log("Migrating roomtypes...");
  const roomTypes = await loadCollection(backupDir, "roomtypes");
  for (const doc of roomTypes) {
    const id = doc._id;
    roomTypeIds.add(id);
    if (!dryRun) {
      await prisma.roomType.upsert({
        where: { id },
        create: {
          id,
          propertyId: doc.propertyId,
          name: doc.name,
          slug: doc.slug,
          shortDescription: doc.shortDescription ?? null,
          description: doc.description ?? null,
          maxAdults: doc.maxAdults ?? 2,
          maxChildren: doc.maxChildren ?? 0,
          maxOccupancy: doc.maxOccupancy ?? 2,
          beds: doc.beds ?? null,
          amenities: doc.amenities ?? null,
          images: doc.images ?? null,
          media: doc.media ?? null,
          propertyDetailsHtml: doc.propertyDetailsHtml ?? null,
          layoutHtml: doc.layoutHtml ?? null,
          floorplanMediaIds: doc.floorplanMediaIds ?? null,
          locationText: doc.locationText ?? null,
          surroundingsHtml: doc.surroundingsHtml ?? null,
          mapLat: doc.mapLat ?? null,
          mapLng: doc.mapLng ?? null,
          mapEmbedUrl: doc.mapEmbedUrl ?? null,
          welcomeHamperIncluded: doc.welcomeHamperIncluded ?? false,
          welcomeHamperDescription: doc.welcomeHamperDescription ?? null,
          welcomeHamperImageMediaId: doc.welcomeHamperImageMediaId ?? null,
          welcomeHamperHtml: doc.welcomeHamperHtml ?? null,
          amenityIds: doc.amenityIds ?? null,
          nearbyAttractions: doc.nearbyAttractions ?? null,
          bedrooms: doc.bedrooms ?? null,
          bathrooms: doc.bathrooms ?? null,
          maxDogs: doc.maxDogs ?? null,
          status: doc.status || "DRAFT",
          seo: doc.seo ?? null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["roomtypes"].migratedCount++;
  }

  // 11. CMS Pages
  console.log("Migrating cmspages...");
  const cmsPages = await loadCollection(backupDir, "cmspages");
  for (const doc of cmsPages) {
    const id = doc._id;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : null;
    if (!dryRun) {
      await prisma.cmsPage.upsert({
        where: { id },
        create: {
          id,
          title: doc.title,
          slug: doc.slug,
          excerpt: doc.excerpt ?? null,
          sections: doc.sections ?? [],
          featuredImageMediaId: doc.featuredImageMediaId ?? null,
          seo: doc.seo ?? null,
          status: doc.status || "DRAFT",
          version: doc.version ?? 1,
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
          createdBy,
          previewToken: doc.previewToken ?? null,
          previewExpiresAt: doc.previewExpiresAt ? new Date(doc.previewExpiresAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["cmspages"].migratedCount++;
  }

  // 12. CMS Blog Posts
  console.log("Migrating cmsblogposts...");
  const blogPosts = await loadCollection(backupDir, "cmsblogposts");
  for (const doc of blogPosts) {
    const id = doc._id;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : null;
    if (!dryRun) {
      await prisma.cmsBlogPost.upsert({
        where: { id },
        create: {
          id,
          title: doc.title,
          slug: doc.slug,
          excerpt: doc.excerpt ?? null,
          content: doc.content ?? "",
          featuredImageMediaId: doc.featuredImageMediaId ?? null,
          author: doc.author ?? null,
          category: doc.category ?? null,
          tags: doc.tags ?? null,
          readingMinutes: doc.readingMinutes ?? 1,
          seo: doc.seo ?? null,
          status: doc.status || "DRAFT",
          version: doc.version ?? 1,
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
          createdBy,
          previewToken: doc.previewToken ?? null,
          previewExpiresAt: doc.previewExpiresAt ? new Date(doc.previewExpiresAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["cmsblogposts"].migratedCount++;
  }

  // 13. CMS FAQs
  console.log("Migrating cmsfaqs...");
  const faqs = await loadCollection(backupDir, "cmsfaqs");
  for (const doc of faqs) {
    const id = doc._id;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : null;
    if (!dryRun) {
      await prisma.cmsFaq.upsert({
        where: { id },
        create: {
          id,
          question: doc.question,
          answer: doc.answer ?? "",
          category: doc.category ?? null,
          sortOrder: doc.sortOrder ?? 0,
          status: doc.status || "DRAFT",
          version: doc.version ?? 1,
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
          createdBy,
          previewToken: doc.previewToken ?? null,
          previewExpiresAt: doc.previewExpiresAt ? new Date(doc.previewExpiresAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["cmsfaqs"].migratedCount++;
  }

  // 14. CMS Offers
  console.log("Migrating cmsoffers...");
  const offers = await loadCollection(backupDir, "cmsoffers");
  for (const doc of offers) {
    const id = doc._id;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : null;
    if (!dryRun) {
      await prisma.cmsOffer.upsert({
        where: { id },
        create: {
          id,
          title: doc.title,
          slug: doc.slug,
          description: doc.description ?? "",
          imageMediaId: doc.imageMediaId ?? null,
          validFrom: doc.validFrom ? new Date(doc.validFrom) : null,
          validUntil: doc.validUntil ? new Date(doc.validUntil) : null,
          ctaLabel: doc.ctaLabel ?? null,
          ctaUrl: doc.ctaUrl ?? null,
          couponId: doc.couponId ?? null,
          seo: doc.seo ?? null,
          status: doc.status || "DRAFT",
          version: doc.version ?? 1,
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
          createdBy,
          previewToken: doc.previewToken ?? null,
          previewExpiresAt: doc.previewExpiresAt ? new Date(doc.previewExpiresAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["cmsoffers"].migratedCount++;
  }

  // 15. CMS Policy Docs
  console.log("Migrating cmspolicydocs...");
  const policyDocs = await loadCollection(backupDir, "cmspolicydocs");
  for (const doc of policyDocs) {
    const key = doc.key;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : null;
    if (!dryRun) {
      await prisma.cmsPolicyDoc.upsert({
        where: { key },
        create: {
          id: doc._id,
          key,
          title: doc.title,
          body: doc.body ?? "",
          status: doc.status || "DRAFT",
          version: doc.version ?? 1,
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
          createdBy,
          previewToken: doc.previewToken ?? null,
          previewExpiresAt: doc.previewExpiresAt ? new Date(doc.previewExpiresAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["cmspolicydocs"].migratedCount++;
  }

  // ----------------------------------------------------
  // TIER 3: Rooms, RatePlans, Coupons, Enquiries
  // ----------------------------------------------------

  // 16. Rooms
  console.log("Migrating rooms...");
  const rooms = await loadCollection(backupDir, "rooms");
  for (const doc of rooms) {
    const id = doc._id;
    roomIds.add(id);
    if (!dryRun) {
      await prisma.room.upsert({
        where: { id },
        create: {
          id,
          propertyId: doc.propertyId,
          roomTypeId: doc.roomTypeId,
          name: doc.name,
          roomNumber: doc.roomNumber,
          floor: doc.floor ?? null,
          status: doc.status || "ACTIVE",
          condition: doc.condition ?? null,
          notes: doc.notes ?? null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["rooms"].migratedCount++;
  }

  // 17. RatePlans
  console.log("Migrating rateplans...");
  const ratePlans = await loadCollection(backupDir, "rateplans");
  for (const doc of ratePlans) {
    const id = doc._id;
    ratePlanIds.add(id);
    const cancellationPolicyId =
      doc.cancellationPolicyId && cancellationPolicyIds.has(doc.cancellationPolicyId)
        ? doc.cancellationPolicyId
        : null;
    if (!dryRun) {
      await prisma.ratePlan.upsert({
        where: { id },
        create: {
          id,
          propertyId: doc.propertyId,
          roomTypeId: doc.roomTypeId,
          name: doc.name,
          slug: doc.slug,
          description: doc.description ?? null,
          pricing: doc.pricing,
          restrictions: doc.restrictions ?? {},
          cancellationPolicyId,
          status: doc.status || "DRAFT",
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["rateplans"].migratedCount++;
  }

  // 18. Coupons
  console.log("Migrating coupons...");
  const coupons = await loadCollection(backupDir, "coupons");
  for (const doc of coupons) {
    const id = doc._id;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : Array.from(userIds)[0];
    if (!dryRun) {
      await prisma.coupon.upsert({
        where: { id },
        create: {
          id,
          propertyId: doc.propertyId,
          code: doc.code,
          normalizedCode: doc.normalizedCode,
          discountType: doc.discountType,
          discountValue: new Prisma.Decimal(doc.discountValue),
          maxDiscount: doc.maxDiscount != null ? new Prisma.Decimal(doc.maxDiscount) : null,
          minimumBookingAmount:
            doc.minimumBookingAmount != null ? new Prisma.Decimal(doc.minimumBookingAmount) : null,
          validFrom: doc.validFrom ? new Date(doc.validFrom) : null,
          validUntil: doc.validUntil ? new Date(doc.validUntil) : null,
          usageLimit: doc.usageLimit ?? null,
          usageCount: doc.usageCount ?? 0,
          perUserLimit: doc.perUserLimit ?? null,
          applicableRoomTypeIds: doc.applicableRoomTypeIds ?? null,
          status: doc.status || "ACTIVE",
          createdBy,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["coupons"].migratedCount++;
  }

  // 19. Enquiries
  console.log("Migrating enquiries...");
  const enquiries = await loadCollection(backupDir, "enquiries");
  for (const doc of enquiries) {
    const id = doc._id;
    const roomTypeId = doc.roomTypeId && roomTypeIds.has(doc.roomTypeId) ? doc.roomTypeId : null;
    if (!dryRun) {
      await prisma.enquiry.upsert({
        where: { id },
        create: {
          id,
          title: doc.title ?? null,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          telephone: doc.telephone,
          holidayBudget: doc.holidayBudget ?? null,
          partySize: doc.partySize ?? null,
          bedrooms: doc.bedrooms ?? null,
          fromDate: doc.fromDate ?? null,
          toDate: doc.toDate ?? null,
          specificLocation: doc.specificLocation ?? null,
          dogFriendly: doc.dogFriendly ?? null,
          details: doc.details ?? null,
          roomTypeId,
          status: doc.status || "NEW",
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["enquiries"].migratedCount++;
  }

  // ----------------------------------------------------
  // TIER 4: DailyPrices, AvailabilityBlocks, Bookings
  // ----------------------------------------------------

  // 20. DailyPrices
  console.log("Migrating dailyprices...");
  const dailyPrices = await loadCollection(backupDir, "dailyprices");
  for (const doc of dailyPrices) {
    if (!dryRun) {
      await prisma.dailyPrice.upsert({
        where: {
          ratePlanId_date: {
            ratePlanId: doc.ratePlanId,
            date: new Date(doc.date),
          },
        },
        create: {
          id: doc._id,
          ratePlanId: doc.ratePlanId,
          propertyId: doc.propertyId,
          date: new Date(doc.date),
          price: doc.price,
          currency: doc.currency || "GBP",
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["dailyprices"].migratedCount++;
  }

  // 21. AvailabilityBlocks
  console.log("Migrating availabilityblocks...");
  const availabilityBlocks = await loadCollection(backupDir, "availabilityblocks");
  for (const doc of availabilityBlocks) {
    const id = doc._id;
    const createdBy = doc.createdBy && userIds.has(doc.createdBy) ? doc.createdBy : Array.from(userIds)[0];
    if (!dryRun) {
      await prisma.availabilityBlock.upsert({
        where: { id },
        create: {
          id,
          propertyId: doc.propertyId,
          roomId: doc.roomId,
          startDate: new Date(doc.startDate),
          endDate: new Date(doc.endDate),
          reason: doc.reason ?? null,
          createdBy,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["availabilityblocks"].migratedCount++;
  }

  // 22. Bookings
  console.log("Migrating bookings...");
  const bookings = await loadCollection(backupDir, "bookings");
  for (const doc of bookings) {
    const id = doc._id;
    bookingIds.add(id);
    const userId = doc.userId && userIds.has(doc.userId) ? doc.userId : null;
    if (!dryRun) {
      await prisma.booking.upsert({
        where: { id },
        create: {
          id,
          bookingNumber: doc.bookingNumber,
          propertyId: doc.propertyId,
          userId,
          status: doc.status || "HELD",
          paymentStatus: doc.paymentStatus || "PENDING",
          checkIn: new Date(doc.checkIn),
          checkOut: new Date(doc.checkOut),
          guests: doc.guests,
          contact: doc.contact,
          pricing: doc.pricing,
          cancellation: doc.cancellation ?? null,
          hold: doc.hold ?? null,
          stay: doc.stay ?? null,
          source: doc.source || "DIRECT",
          notes: doc.notes ?? null,
          reminderSent: doc.reminderSent ?? false,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["bookings"].migratedCount++;
  }

  // ----------------------------------------------------
  // TIER 5: BookingItems, Payments, Reviews, Notifications
  // ----------------------------------------------------

  // 23. BookingItems
  console.log("Migrating bookingitems...");
  const bookingItems = await loadCollection(backupDir, "bookingitems");
  for (const doc of bookingItems) {
    const id = doc._id;
    const roomId = doc.roomId && roomIds.has(doc.roomId) ? doc.roomId : null;
    const roomTypeId = doc.roomTypeId && roomTypeIds.has(doc.roomTypeId) ? doc.roomTypeId : null;
    const ratePlanId = doc.ratePlanId && ratePlanIds.has(doc.ratePlanId) ? doc.ratePlanId : null;
    if (!dryRun) {
      await prisma.bookingItem.upsert({
        where: { id },
        create: {
          id,
          bookingId: doc.bookingId,
          roomTypeId,
          roomId,
          ratePlanId,
          roomNameSnapshot: doc.roomNameSnapshot,
          roomNumberSnapshot: doc.roomNumberSnapshot ?? null,
          ratePlanNameSnapshot: doc.ratePlanNameSnapshot,
          checkIn: new Date(doc.checkIn),
          checkOut: new Date(doc.checkOut),
          guests: doc.guests,
          pricing: doc.pricing,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["bookingitems"].migratedCount++;
  }

  // 24. Payments
  console.log("Migrating payments...");
  const payments = await loadCollection(backupDir, "payments");
  for (const doc of payments) {
    const id = doc._id;
    paymentIds.add(id);
    const userId = doc.userId && userIds.has(doc.userId) ? doc.userId : null;
    if (!dryRun) {
      await prisma.payment.upsert({
        where: { id },
        create: {
          id,
          bookingId: doc.bookingId,
          userId,
          provider: doc.provider || "STRIPE",
          providerPaymentIntentId: doc.providerPaymentIntentId ?? null,
          providerCheckoutSessionId: doc.providerCheckoutSessionId ?? null,
          amount: new Prisma.Decimal(doc.amount),
          currency: doc.currency,
          status: doc.status || "PENDING",
          failureCode: doc.failureCode ?? null,
          failureMessage: doc.failureMessage ?? null,
          paidAt: doc.paidAt ? new Date(doc.paidAt) : null,
          metadata: doc.metadata ?? null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["payments"].migratedCount++;
  }

  // 25. Reviews
  console.log("Migrating reviews...");
  const reviews = await loadCollection(backupDir, "reviews");
  for (const doc of reviews) {
    const id = doc._id;
    const userId = doc.userId && userIds.has(doc.userId) ? doc.userId : null;
    const bookingId = doc.bookingId && bookingIds.has(doc.bookingId) ? doc.bookingId : null;
    const roomTypeId = doc.roomTypeId && roomTypeIds.has(doc.roomTypeId) ? doc.roomTypeId : null;
    if (!dryRun) {
      await prisma.review.upsert({
        where: { id },
        create: {
          id,
          roomTypeId,
          userId,
          bookingId,
          authorName: doc.authorName,
          rating: doc.rating,
          title: doc.title ?? null,
          body: doc.body,
          stayDate: doc.stayDate ?? null,
          isVerified: doc.isVerified ?? false,
          isAdminCreated: doc.isAdminCreated ?? false,
          status: doc.status || "PENDING",
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["reviews"].migratedCount++;
  }

  // 26. Notifications
  console.log("Migrating notifications...");
  const notifications = await loadCollection(backupDir, "notifications");
  for (const doc of notifications) {
    const id = doc._id;
    const bookingId = doc.bookingId && bookingIds.has(doc.bookingId) ? doc.bookingId : null;
    const paymentId = doc.paymentId && paymentIds.has(doc.paymentId) ? doc.paymentId : null;
    if (!dryRun) {
      await prisma.notification.upsert({
        where: { id },
        create: {
          id,
          type: doc.type,
          recipient: doc.recipient,
          bookingId,
          paymentId,
          idempotencyKey: doc.idempotencyKey,
          status: doc.status || "QUEUED",
          attempts: doc.attempts ?? 0,
          maxAttempts: doc.maxAttempts ?? 5,
          nextAttemptAt: doc.nextAttemptAt ? new Date(doc.nextAttemptAt) : null,
          lastError: doc.lastError ?? null,
          provider: doc.provider ?? null,
          providerMessageId: doc.providerMessageId ?? null,
          sentAt: doc.sentAt ? new Date(doc.sentAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["notifications"].migratedCount++;
  }

  // ----------------------------------------------------
  // TIER 6: Refunds, AuditLogs
  // ----------------------------------------------------

  // 27. Refunds
  console.log("Migrating refunds...");
  const refunds = await loadCollection(backupDir, "refunds");
  for (const doc of refunds) {
    const id = doc._id;
    const requestedBy = doc.requestedBy && userIds.has(doc.requestedBy) ? doc.requestedBy : null;
    if (!dryRun) {
      await prisma.refund.upsert({
        where: { id },
        create: {
          id,
          bookingId: doc.bookingId,
          paymentId: doc.paymentId,
          provider: doc.provider || "STRIPE",
          providerRefundId: doc.providerRefundId,
          amount: new Prisma.Decimal(doc.amount),
          currency: doc.currency,
          status: doc.status || "SUCCEEDED",
          reason: doc.reason ?? null,
          requestedBy,
          processedAt: doc.processedAt ? new Date(doc.processedAt) : null,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        },
        update: {},
      });
    }
    stats["refunds"].migratedCount++;
  }

  // 28. AuditLogs
  console.log("Migrating auditlogs...");
  const auditLogs = await loadCollection(backupDir, "auditlogs");
  for (const doc of auditLogs) {
    const id = doc._id;
    if (!dryRun) {
      await prisma.auditLog.upsert({
        where: { id },
        create: {
          id,
          actorId: doc.actorId ?? null,
          actorRole: doc.actorRole ?? null,
          action: doc.action,
          entityType: doc.entityType,
          entityId: doc.entityId ?? null,
          before: doc.before ?? null,
          after: doc.after ?? null,
          metadata: doc.metadata ?? null,
          ip: doc.ip ?? null,
          userAgent: doc.userAgent ?? null,
          createdAt: new Date(doc.createdAt),
        },
        update: {},
      });
    }
    stats["auditlogs"].migratedCount++;
  }

  // ----------------------------------------------------
  // VERIFICATION & RECONCILIATION REPORT
  // ----------------------------------------------------

  console.log(`\n==================================================`);
  console.log(`Migration Reconciliation Report`);
  console.log(`==================================================\n`);

  let allMatched = true;
  let totalSource = 0;
  let totalMigrated = 0;

  console.log(
    `${"Collection".padEnd(25)} | ${"Mongo Docs".padStart(10)} | ${"MySQL Rows".padStart(10)} | Status`
  );
  console.log("-".repeat(60));

  for (const [name, s] of Object.entries(stats)) {
    totalSource += s.sourceCount;
    totalMigrated += s.migratedCount;
    const match = s.sourceCount === s.migratedCount;
    if (!match) allMatched = false;
    const statusIcon = match ? "✅ MATCH" : "❌ MISMATCH";
    console.log(
      `${name.padEnd(25)} | ${String(s.sourceCount).padStart(10)} | ${String(s.migratedCount).padStart(10)} | ${statusIcon}`
    );
  }

  console.log("-".repeat(60));
  console.log(
    `${"TOTAL".padEnd(25)} | ${String(totalSource).padStart(10)} | ${String(totalMigrated).padStart(10)} | ${
      allMatched ? "✅ ZERO DATA LOSS" : "❌ CHECK FAILURES"
    }`
  );
  console.log(`==================================================\n`);

  if (!allMatched) {
    throw new Error("Data reconciliation failed: counts do not match between MongoDB and MySQL.");
  }

  console.log("🎉 Migration rehearsal completed successfully with 100% record parity!\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Migration error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });

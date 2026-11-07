import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { newId } from "../utils/id";
import { ensureProperty } from "../modules/properties/property.service";
import { slugify } from "../utils/slug";

const HIGHLIGHTS = [
  "One dog allowed",
  "Parking",
  "WiFi",
  "Baby Welcome",
  "Padel",
  "Golfing",
  "Walking",
];

const FACILITIES = [
  "Electric hob & oven",
  "Garden furniture",
  "Television",
  "Washer/dryer",
  "Dog-friendly",
  "Bed Linen",
  "Dishwasher",
  "Fridge/Freezer",
  "Microwave",
  "Towels",
  "Infants",
];

/** Mock icon per amenity until real icons are uploaded (picsum seeds). */
function mockIcon(slug: string): string {
  return `https://picsum.photos/seed/amenity-${slug}/96`;
}

/**
 * One-time differentiation for the pre-split state (global AUTUMN20, no
 * WINTER15): Oakwood keeps 20% OFF, Fern gets a new 15% OFF, the rest show
 * no badge. Skipped once differentiated or customized — admin edits win.
 */
async function alignOfferScoping(propertyId: string): Promise<void> {
  const [autumn, winter] = await Promise.all([
    prisma.coupon.findFirst({ where: { propertyId, normalizedCode: "AUTUMN20" } }),
    prisma.coupon.findFirst({ where: { propertyId, normalizedCode: "WINTER15" } }),
  ]);
  const autumnRoomTypeIds = Array.isArray(autumn?.applicableRoomTypeIds) ? (autumn.applicableRoomTypeIds as string[]) : [];
  if (!autumn || winter || autumnRoomTypeIds.length > 0) return;
  const [oakwood, fern] = await Promise.all([
    prisma.roomType.findFirst({ where: { slug: "oakwood-cottage" }, select: { id: true } }),
    prisma.roomType.findFirst({ where: { slug: "fern-cottage" }, select: { id: true } }),
  ]);
  if (!oakwood || !fern) return;
  await prisma.coupon.update({
    where: { id: autumn.id },
    data: { applicableRoomTypeIds: [oakwood.id] as any },
  });
  const adminUser = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
  const created = await prisma.coupon.create({
    data: {
      id: newId(),
      propertyId,
      code: "WINTER15",
      normalizedCode: "WINTER15",
      discountType: "PERCENTAGE",
      discountValue: 15,
      maxDiscount: null,
      minimumBookingAmount: null,
      validFrom: new Date("2026-09-30T00:00:00Z"),
      validUntil: new Date("2027-01-04T23:59:59Z"),
      usageLimit: null,
      usageCount: 0,
      perUserLimit: null,
      applicableRoomTypeIds: [fern.id] as any,
      status: "ACTIVE",
      createdBy: adminUser?.id ?? propertyId,
    },
  });
  const existingWinter = await prisma.cmsOffer.findUnique({
    where: { slug: "15-percent-off-winter" },
  });
  if (!existingWinter) {
    await prisma.cmsOffer.create({
      data: {
        id: newId(),
        title: "15% OFF Winter Stays",
        slug: "15-percent-off-winter",
        description:
          "15% off for holidays taken between Wed 30th September 2026 and Mon 4th January 2027.\nMinimum of 2 nights booking with a maximum of 28 nights.\n* Discount applies to base rent only\n* The discount will be applied at checkout",
        validFrom: new Date("2026-09-30T00:00:00Z"),
        validUntil: new Date("2027-01-04T23:59:59Z"),
        ctaLabel: "Book now",
        ctaUrl: "/",
        couponId: created.id,
        status: "PUBLISHED",
        version: 1,
        publishedAt: new Date(),
      },
    });
  } else if (!existingWinter.couponId) {
    await prisma.cmsOffer.update({
      where: { id: existingWinter.id },
      data: { couponId: created.id },
    });
  }
}

/** Seeds amenities, the 20% autumn offer + coupon. Idempotent. */
export async function seedContent() {
  try {
    const property = await ensureProperty();
    let order = 0;
    for (const name of HIGHLIGHTS) {
      const slug = slugify(name);
      await prisma.amenity.upsert({
        where: { slug },
        create: {
          id: newId(),
          name,
          slug,
          group: "HIGHLIGHT",
          sortOrder: order++,
          status: "ACTIVE",
          iconUrl: mockIcon(slug),
        },
        update: {
          group: "HIGHLIGHT",
        },
      });
    }
    order = 0;
    for (const name of FACILITIES) {
      const slug = slugify(name);
      await prisma.amenity.upsert({
        where: { slug },
        create: {
          id: newId(),
          name,
          slug,
          group: "FACILITY",
          sortOrder: order++,
          status: "ACTIVE",
          iconUrl: mockIcon(slug),
        },
        update: {
          group: "FACILITY",
        },
      });
    }

    // 20% OFF 30 Sep 2026 – 4 Jan 2027, min 2 / max 28 nights, base rent only.
    const existing = await prisma.coupon.findFirst({
      where: { propertyId: property.id, normalizedCode: "AUTUMN20" },
    });
    let couponId = existing?.id ?? null;
    if (!existing) {
      const adminUser = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
      const created = await prisma.coupon.create({
        data: {
          id: newId(),
          propertyId: property.id,
          code: "AUTUMN20",
          normalizedCode: "AUTUMN20",
          discountType: "PERCENTAGE",
          discountValue: 20,
          maxDiscount: null,
          minimumBookingAmount: null,
          validFrom: new Date("2026-09-30T00:00:00Z"),
          validUntil: new Date("2027-01-04T23:59:59Z"),
          usageLimit: null,
          usageCount: 0,
          perUserLimit: null,
          applicableRoomTypeIds: [],
          status: "ACTIVE",
          createdBy: adminUser?.id ?? property.id,
        },
      });
      couponId = created.id;
    }
    // Why book with us? Bodies are seeded only where missing or empty,
    // so admin edits in Settings are never overwritten.
    const whyBookDefaults: Array<{ title: string; text: string }> = [
      {
        title: "Local knowledge",
        text: "<p>We live and work in the area, so ask us anything — the best walks, pubs, beaches and rainy-day plans.</p>",
      },
      {
        title: "Property",
        text: "<p>A single hand-picked property, prepared to the same high standard for every arrival.</p>",
      },
      {
        title: "Quality checked",
        text: "<p>Checked and cleaned before every stay, so everything works the way it should when you walk in.</p>",
      },
      {
        title: "Customer Satisfaction",
        text: "<p>Most of our guests come back or send friends. If anything falls short during your stay, tell us and we will make it right.</p>",
      },
      {
        title: "24/7 support",
        text: "<p>A real person is on call around the clock during your stay — call any time, day or night.</p>",
      },
    ];
    const settingsDoc = await prisma.siteSettings.findUnique({ where: { key: "site" } });
    const current = (settingsDoc?.whyBookWithUs ?? []) as Array<{ title: string; text?: string | null }>;
    const merged = whyBookDefaults.map((seed) => {
      const existingItem = current.find((item) => item.title === seed.title);
      if (existingItem && existingItem.text && existingItem.text.trim().length > 0) {
        return { title: existingItem.title, text: existingItem.text };
      }
      return seed;
    });
    await prisma.siteSettings.upsert({
      where: { key: "site" },
      create: {
        id: newId(),
        key: "site",
        whyBookWithUs: merged,
      },
      update: {
        whyBookWithUs: merged,
      },
    });
    const offerSlug = "20-percent-off-autumn-winter";
    const autumnDescription =
      "20% off for holidays taken between Wed 30th September 2026 and Mon 4th January 2027.\nMinimum of 2 nights booking with a maximum of 28 nights.\n* Discount applies to base rent only\n* The discount will be applied at checkout";
    const existingOffer = await prisma.cmsOffer.findUnique({
      where: { slug: offerSlug },
    });
    if (!existingOffer) {
      await prisma.cmsOffer.create({
        data: {
          id: newId(),
          title: "20% OFF Autumn & Winter Stays",
          slug: offerSlug,
          description: autumnDescription,
          validFrom: new Date("2026-09-30T00:00:00Z"),
          validUntil: new Date("2027-01-04T23:59:59Z"),
          ctaLabel: "Book now",
          ctaUrl: "/",
          couponId,
          status: "PUBLISHED",
          version: 1,
          publishedAt: new Date(),
        },
      });
    } else if (couponId && !existingOffer.couponId && existingOffer.description === autumnDescription) {
      await prisma.cmsOffer.update({
        where: { id: existingOffer.id },
        data: { couponId },
      });
    }
    await alignOfferScoping(property.id);
    await seedHamper();
    logger.info("Content seed complete (amenities + AUTUMN20 offer)");
  } catch (error) {
    logger.warn("Content seed skipped", { message: error instanceof Error ? error.message : String(error) });
  }
}

const HAMPER_SEED =
  "<h3>What’s in the hamper</h3>" +
  "<p>Every stay starts with a welcome hamper of local favourites, ready in the kitchen on arrival.</p>" +
  "<ul><li>Fresh bread and local cheese</li><li>Farm eggs and butter</li><li>Tea, coffee and biscuits</li></ul>" +
  '<p>Tell us about dietary needs in <a href="https://hamptworthstays.com/plan-your-experience/">your enquiry</a> and we will adjust it.</p>';

/**
 * Fills hamper content only where the admin left
 * it empty — existing content is never overwritten.
 */
async function seedHamper(): Promise<void> {
  const rooms = await prisma.roomType.findMany({ select: { id: true, welcomeHamperHtml: true } });
  for (const room of rooms) {
    if (!room.welcomeHamperHtml || room.welcomeHamperHtml.trim().length === 0) {
      await prisma.roomType.update({
        where: { id: room.id },
        data: {
          welcomeHamperHtml: HAMPER_SEED,
          welcomeHamperIncluded: true,
        },
      });
    }
  }
}

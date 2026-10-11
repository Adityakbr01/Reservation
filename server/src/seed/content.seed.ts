import { logger } from "../config/logger";
import { AmenityModel } from "../modules/amenities/amenity.model";
import { CouponModel } from "../modules/coupons/coupon.model";
import { OfferModel } from "../modules/cms/cms.model";
import { ensureProperty } from "../modules/properties/property.service";
import { RoomTypeModel } from "../modules/roomTypes/room-type.model";
import { SiteSettingsModel } from "../modules/settings/settings.model";
import { UserModel } from "../modules/users/user.model";
import { slugify } from "../utils/slug";

const HIGHLIGHTS = [
  "One dog allowed",
  "Parking",
  "WiFi",
  "Baby Welcome",
  "Bird Watching",
  "Ground Floor Bedroom",
  "Cycling",
  "Romantic Breaks",
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
  "Within walking distance of the pub",
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
    CouponModel.findOne({ propertyId, normalizedCode: "AUTUMN20" }).exec(),
    CouponModel.findOne({ propertyId, normalizedCode: "WINTER15" }).exec(),
  ]);
  if (!autumn || winter || (autumn.applicableRoomTypeIds ?? []).length > 0) return;
  const [oakwood, fern] = await Promise.all([
    RoomTypeModel.findOne({ slug: "oakwood-cottage" }).select("_id").exec(),
    RoomTypeModel.findOne({ slug: "fern-cottage" }).select("_id").exec(),
  ]);
  if (!oakwood || !fern) return;
  autumn.applicableRoomTypeIds = [oakwood._id];
  await autumn.save();
  const adminUser = await UserModel.findOne({ role: "admin" }).select("_id").exec();
  const created = await CouponModel.create({
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
    applicableRoomTypeIds: [fern._id],
    status: "ACTIVE",
    createdBy: adminUser?._id ?? propertyId,
  });
  await OfferModel.updateOne(
    { slug: "15-percent-off-winter" },
    {
      $setOnInsert: {
        title: "15% OFF Winter Stays",
        slug: "15-percent-off-winter",
        description:
          "15% off for holidays taken between Wed 30th September 2026 and Mon 4th January 2027.\nMinimum of 2 nights booking with a maximum of 28 nights.\n* Discount applies to base rent only\n* The discount will be applied at checkout",
        validFrom: new Date("2026-09-30T00:00:00Z"),
        validUntil: new Date("2027-01-04T23:59:59Z"),
        ctaLabel: "Book now",
        ctaUrl: "/",
        couponId: created._id,
        status: "PUBLISHED",
        version: 1,
        publishedAt: new Date(),
      },
    },
    { upsert: true },
  ).exec();
  // Same backfill as the autumn offer — pre-existing docs keep couponId null.
  await OfferModel.updateOne(
    {
      slug: "15-percent-off-winter",
      couponId: null,
      description:
        "15% off for holidays taken between Wed 30th September 2026 and Mon 4th January 2027.\nMinimum of 2 nights booking with a maximum of 28 nights.\n* Discount applies to base rent only\n* The discount will be applied at checkout",
    },
    { $set: { couponId: created._id } },
  ).exec();
}

/** Seeds amenities, the 20% autumn offer + coupon. Idempotent. */
export async function seedContent() {
  try {
    const property = await ensureProperty();
    let order = 0;
    for (const name of HIGHLIGHTS) {
      const slug = slugify(name);
      await AmenityModel.updateOne(
        { slug },
        { $setOnInsert: { name, slug, group: "HIGHLIGHT", sortOrder: order++, status: "ACTIVE" } },
        { upsert: true },
      ).exec();
      // Normalize category for items seeded before groups existed.
      await AmenityModel.updateOne({ slug, group: { $ne: "HIGHLIGHT" } }, { $set: { group: "HIGHLIGHT" } }).exec();
      // Fill mock icons only where the admin hasn't set an image yet.
      await AmenityModel.updateOne(
        { slug, imageMediaId: null, $or: [{ iconUrl: null }, { iconUrl: "" }] },
        { $set: { iconUrl: mockIcon(slug) } },
      ).exec();
    }
    order = 0;
    for (const name of FACILITIES) {
      const slug = slugify(name);
      await AmenityModel.updateOne(
        { slug },
        { $setOnInsert: { name, slug, group: "FACILITY", sortOrder: order++, status: "ACTIVE" } },
        { upsert: true },
      ).exec();
      // Normalize category for items seeded before groups existed.
      await AmenityModel.updateOne({ slug, group: { $ne: "FACILITY" } }, { $set: { group: "FACILITY" } }).exec();
      await AmenityModel.updateOne(
        { slug, imageMediaId: null, $or: [{ iconUrl: null }, { iconUrl: "" }] },
        { $set: { iconUrl: mockIcon(slug) } },
      ).exec();
    }

    // 20% OFF 30 Sep 2026 – 4 Jan 2027, min 2 / max 28 nights, base rent only.
    const existing = await CouponModel.findOne({ propertyId: property.id, normalizedCode: "AUTUMN20" }).exec();
    let couponId = existing?._id ?? null;
    if (!existing) {
      const adminUser = await UserModel.findOne({ role: "admin" }).select("_id").exec();
      const created = await CouponModel.create({
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
        createdBy: adminUser?._id ?? property.id,
      });
      couponId = created._id;
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
    const settingsDoc = await SiteSettingsModel.findOne({ key: "site" }).exec();
    const current: Array<{ title: string; text?: string | null }> =
      settingsDoc?.whyBookWithUs ?? [];
    const merged = whyBookDefaults.map((seed) => {
      const existingItem = current.find((item) => item.title === seed.title);
      if (existingItem && existingItem.text && existingItem.text.trim().length > 0) {
        return { title: existingItem.title, text: existingItem.text };
      }
      return seed;
    });
    await SiteSettingsModel.updateOne(
      { key: "site" },
      { $set: { whyBookWithUs: merged } },
      { upsert: true },
    ).exec();
    const offerSlug = "20-percent-off-autumn-winter";
    const autumnDescription =
      "20% off for holidays taken between Wed 30th September 2026 and Mon 4th January 2027.\nMinimum of 2 nights booking with a maximum of 28 nights.\n* Discount applies to base rent only\n* The discount will be applied at checkout";
    await OfferModel.updateOne(
      { slug: offerSlug },
      {
        $setOnInsert: {
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
      },
      { upsert: true },
    ).exec();
    // Backfill the coupon link for offers seeded before coupon-linking
    // existed ($setOnInsert never touches pre-existing docs). Only pristine
    // seed text is touched — customized offers (admin edits) always win.
    if (couponId) {
      await OfferModel.updateOne(
        { slug: offerSlug, couponId: null, description: autumnDescription },
        { $set: { couponId } },
      ).exec();
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
  '<p>Tell us about dietary needs in <a href="/enquire">your enquiry</a> and we will adjust it.</p>';

/**
 * Fills hamper content only where the admin left
 * it empty — existing content is never overwritten.
 */
async function seedHamper(): Promise<void> {
  const rooms = await RoomTypeModel.find({}).select("_id welcomeHamperHtml").exec();
  for (const room of rooms) {
    const patch: Record<string, unknown> = {};
    if (!room.welcomeHamperHtml || room.welcomeHamperHtml.trim().length === 0) {
      patch.welcomeHamperHtml = HAMPER_SEED;
      patch.welcomeHamperIncluded = true;
    }
    if (Object.keys(patch).length > 0) {
      await RoomTypeModel.updateOne({ _id: room._id }, { $set: patch }).exec();
    }
  }
}

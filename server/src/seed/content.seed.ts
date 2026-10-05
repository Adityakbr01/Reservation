import { logger } from "../config/logger";
import { AmenityModel } from "../modules/amenities/amenity.model";
import { CouponModel } from "../modules/coupons/coupon.model";
import { OfferModel } from "../modules/cms/cms.model";
import { ensureProperty } from "../modules/properties/property.service";
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
    }
    order = 0;
    for (const name of FACILITIES) {
      const slug = slugify(name);
      await AmenityModel.updateOne(
        { slug },
        { $setOnInsert: { name, slug, group: "FACILITY", sortOrder: order++, status: "ACTIVE" } },
        { upsert: true },
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
    await SiteSettingsModel.updateOne(
      { key: "site", $or: [{ whyBookWithUs: { $exists: false } }, { whyBookWithUs: { $size: 0 } }] },
      {
        $set: {
          whyBookWithUs: [
            { title: "Local knowledge", text: null },
            { title: "Property", text: null },
            { title: "Quality checked", text: null },
            { title: "Customer Satisfaction", text: null },
            { title: "24/7 support", text: null },
          ],
        },
      },
    ).exec();
    const offerSlug = "20-percent-off-autumn-winter";
    await OfferModel.updateOne(
      { slug: offerSlug },
      {
        $setOnInsert: {
          title: "20% OFF Autumn & Winter Stays",
          slug: offerSlug,
          description:
            "20% off for holidays taken between Wed 30th September 2026 and Mon 4th January 2027.\nMinimum of 2 nights booking with a maximum of 28 nights.\n* Discount applies to base rent only\n* The discount will be applied at checkout",
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
    logger.info("Content seed complete (amenities + AUTUMN20 offer)");
  } catch (error) {
    logger.warn("Content seed skipped", { message: error instanceof Error ? error.message : String(error) });
  }
}

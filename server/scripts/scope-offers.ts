import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { OfferModel } from "../src/modules/cms/cms.model";
import { CouponModel } from "../src/modules/coupons/coupon.model";
import { ensureProperty } from "../src/modules/properties/property.service";
import { RoomTypeModel } from "../src/modules/roomTypes/room-type.model";
import { UserModel } from "../src/modules/users/user.model";

/**
 * One-off: differentiate offers per cottage (run on request only).
 * - Oakwood Cottage → 20% OFF (AUTUMN20)
 * - Fern Cottage → 15% OFF (WINTER15, created here if missing)
 * - Dales / Willow / Foxglove → no offer badge
 */
async function main(): Promise<void> {
  await connectDatabase();
  const property = await ensureProperty();
  const adminUser = await UserModel.findOne({ role: "admin" }).select("_id").exec();

  const rooms = await RoomTypeModel.find({
    slug: { $in: ["oakwood-cottage", "fern-cottage"] },
  })
    .select("_id slug name")
    .exec();
  const bySlug = new Map(rooms.map((r) => [r.slug, r._id]));
  const oakwood = bySlug.get("oakwood-cottage");
  const fern = bySlug.get("fern-cottage");
  if (!oakwood || !fern) throw new Error("Cottages missing — run replace-cottages first");

  const autumn = await CouponModel.findOne({ propertyId: property.id, normalizedCode: "AUTUMN20" }).exec();
  if (autumn) {
    autumn.applicableRoomTypeIds = [oakwood];
    await autumn.save();
    console.log("SCOPED:AUTUMN20 -> Oakwood Cottage");
  }

  let winter = await CouponModel.findOne({ propertyId: property.id, normalizedCode: "WINTER15" }).exec();
  if (!winter) {
    winter = await CouponModel.create({
      propertyId: property.id,
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
      applicableRoomTypeIds: [fern],
      status: "ACTIVE",
      createdBy: adminUser?._id ?? property.id,
    });
    console.log("CREATED:WINTER15 -> Fern Cottage");
  } else {
    winter.applicableRoomTypeIds = [fern];
    await winter.save();
    console.log("SCOPED:WINTER15 -> Fern Cottage");
  }

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
        couponId: winter._id,
        status: "PUBLISHED",
        version: 1,
        publishedAt: new Date(),
      },
    },
    { upsert: true },
  ).exec();
  console.log("OFFER:15-percent-off-winter ready");

  await disconnectDatabase();
}

main()
  .then(() => {
    console.log("SCOPE_DONE");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("SCOPE_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });

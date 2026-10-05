import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { AmenityModel } from "../src/modules/amenities/amenity.model";
import { AvailabilityBlockModel } from "../src/modules/availability/availability-block.model";
import { BookingModel } from "../src/modules/bookings/booking.model";
import { CouponModel } from "../src/modules/coupons/coupon.model";
import { MediaModel } from "../src/modules/media/media.model";
import { ensureProperty } from "../src/modules/properties/property.service";
import { RatePlanModel } from "../src/modules/ratePlans/rate-plan.model";
import { DailyPriceModel } from "../src/modules/ratePlans/daily-price.model";
import { RoomModel } from "../src/modules/rooms/room.model";
import { RoomTypeModel } from "../src/modules/roomTypes/room-type.model";

/**
 * One-off catalog replacement (run on request only, never on boot):
 * wipes inventory (types, rooms, rate plans, daily prices, blocks) and
 * inserts the 5 Home Farm cottages with scraped content + uploaded media.
 * People/operational data (bookings, reviews, enquiries, newsletter,
 * coupons, offers, amenities, media) is left untouched.
 */
interface CottageSeed {
  name: string;
  slug: string;
  roomCode: string;
  description: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  dogs: number | null;
}

const COTTAGES: CottageSeed[] = [
  {
    name: "Oakwood Cottage",
    slug: "oakwood-cottage",
    roomCode: "OAK-1",
    description:
      "Located in the peaceful village of Hamptworth, close to the New Forest National Park and the highly regarded Hamptworth Golf & Country Club, Oakwood Cottage offers a stylish countryside escape in a truly enviable setting. Part of the beautifully converted Home Farm development, this charming cottage is one of five thoughtfully restored barn conversions that seamlessly blend rural character with contemporary design.",
    guests: 3,
    bedrooms: 2,
    bathrooms: 1,
    dogs: 1,
  },
  {
    name: "The Dales Cottage",
    slug: "the-dales-cottage",
    roomCode: "DAL-1",
    description:
      "Surrounded by the beautiful countryside of Hamptworth and perfectly positioned on the edge of the New Forest, The Dales Cottage offers a peaceful retreat where comfort, style and rural charm come together. Part of the exclusive Home Farm collection of converted barns, this thoughtfully designed cottage provides a wonderful base for exploring the local area or simply enjoying a slower pace of life.",
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    dogs: null,
  },
  {
    name: "Willow Brook",
    slug: "willow-brook",
    roomCode: "WIL-1",
    description:
      "Tucked away within the peaceful surroundings of Home Farm in Hamptworth, Willow Brook offers a delightful rural retreat on the edge of the New Forest. One of five beautifully converted barn cottages, it combines contemporary styling with thoughtful comforts, creating a welcoming base for exploring this stunning part of Hampshire.",
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    dogs: null,
  },
  {
    name: "Foxglove Cottage",
    slug: "foxglove-cottage",
    roomCode: "FOX-1",
    description:
      "Tucked away in the tranquil surroundings of Home Farm in Hamptworth, Foxglove Cottage offers a charming countryside escape on the edge of the enchanting New Forest. One of five beautifully converted barn cottages, it effortlessly blends rustic character with modern comforts, creating a peaceful haven where guests can slow down, relax and reconnect.",
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    dogs: null,
  },
  {
    name: "Fern Cottage",
    slug: "fern-cottage",
    roomCode: "FER-1",
    description:
      "Set amidst peaceful surroundings on the fringes of the New Forest and close to the renowned Hamptworth Golf & Country Club, Fern Cottage is one of Home Farm's charming barns which have been beautifully renovated to create five distinctive cottages. Combining sophisticated interiors, modern conveniences and luxurious finishes, each cottage offers the perfect balance of countryside charm and contemporary living.",
    guests: 6,
    bedrooms: 3,
    bathrooms: 2,
    dogs: null,
  },
];

const LOCATION = "Hamptworth, Hampshire, Dorset Borders";

async function main(): Promise<void> {
  await connectDatabase();
  const property = await ensureProperty();

  const bookingCount = await BookingModel.countDocuments({}).exec();
  console.log(`EXISTING_BOOKINGS:${bookingCount} (kept, snapshots preserved)`);

  const [daily, blocks, plans, rooms, types] = await Promise.all([
    DailyPriceModel.deleteMany({}).exec(),
    AvailabilityBlockModel.deleteMany({}).exec(),
    RatePlanModel.deleteMany({}).exec(),
    RoomModel.deleteMany({}).exec(),
    RoomTypeModel.deleteMany({}).exec(),
  ]);
  console.log(
    `WIPED dailyPrices=${daily.deletedCount} blocks=${blocks.deletedCount} ratePlans=${plans.deletedCount} rooms=${rooms.deletedCount} roomTypes=${types.deletedCount}`,
  );

  // Coupons scoped to deleted rooms become global instead of dead.
  const scoped = await CouponModel.find({
    applicableRoomTypeIds: { $exists: true, $ne: [] },
  }).exec();
  for (const coupon of scoped) {
    coupon.applicableRoomTypeIds = [];
    await coupon.save();
    console.log(`COUPON_UNSCOPED:${coupon.code}`);
  }

  const amenities = await AmenityModel.find({ status: "ACTIVE" })
    .sort({ group: 1, sortOrder: 1 })
    .select("_id")
    .exec();
  const amenityIds = amenities.map((a) => a._id);

  for (const cottage of COTTAGES) {
    const media = await MediaModel.find({ folder: `Cottage/${cottage.name}` })
      .sort({ fileName: 1 })
      .select("_id")
      .exec();
    const gallery = media.map((m, i) => ({
      mediaId: m._id.toString(),
      kind: "image" as const,
      altText: `${cottage.name} photo ${i + 1}`,
      sortOrder: i,
    }));
    const roomType = await RoomTypeModel.create({
      propertyId: property.id,
      name: cottage.name,
      slug: cottage.slug,
      shortDescription: `Cottage in Hamptworth, Hampshire — sleeps ${cottage.guests}`,
      description: cottage.description,
      maxAdults: cottage.guests,
      maxChildren: 0,
      maxOccupancy: cottage.guests,
      beds: [],
      amenities: [],
      images: gallery.map((g) => ({ mediaId: g.mediaId, altText: g.altText, sortOrder: g.sortOrder })),
      media: gallery,
      layoutHtml: null,
      floorplanMediaIds: [],
      locationText: LOCATION,
      surroundingsHtml: null,
      mapLat: null,
      mapLng: null,
      mapEmbedUrl: null,
      welcomeHamperIncluded: true,
      welcomeHamperDescription: null,
      welcomeHamperImageMediaId: null,
      amenityIds,
      bedrooms: cottage.bedrooms,
      bathrooms: cottage.bathrooms,
      maxDogs: cottage.dogs,
      status: "ACTIVE",
      seo: null,
    });
    await RoomModel.create({
      propertyId: property.id,
      roomTypeId: roomType._id,
      name: cottage.name,
      roomNumber: cottage.roomCode,
      floor: null,
      status: "ACTIVE",
      condition: null,
      notes: null,
    });
    // DRAFT with £0: admin sets the nightly price and activates to publish.
    await RatePlanModel.create({
      propertyId: property.id,
      roomTypeId: roomType._id,
      name: "Standard Rate",
      slug: `${cottage.slug}-standard-rate`,
      description: "Base nightly rate — set the price and activate to publish.",
      pricing: { type: "PER_NIGHT", amount: 0, currency: "GBP" },
      restrictions: {},
      cancellationPolicyId: null,
      status: "DRAFT",
    });
    console.log(`ADDED:${cottage.name} gallery=${gallery.length} amenities=${amenityIds.length}`);
  }

  await disconnectDatabase();
}

main()
  .then(() => {
    console.log("REPLACE_DONE");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("REPLACE_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });

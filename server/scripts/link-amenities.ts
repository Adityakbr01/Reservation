import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { AmenityModel } from "../src/modules/amenities/amenity.model";
import { RoomTypeModel } from "../src/modules/roomTypes/room-type.model";

/**
 * One-off backfill: rooms with no linked features get every ACTIVE
 * amenity linked, so the highlights row + facility grid show on the
 * detail page immediately. Admins can untick per room afterwards.
 */
async function main(): Promise<void> {
  await connectDatabase();
  const amenities = await AmenityModel.find({ status: "ACTIVE" })
    .sort({ group: 1, sortOrder: 1 })
    .select("_id")
    .exec();
  const ids = amenities.map((a) => a._id);
  console.log(`ACTIVE_AMENITIES:${ids.length}`);
  const res = await RoomTypeModel.updateMany(
    { $or: [{ amenityIds: { $exists: false } }, { amenityIds: { $size: 0 } }] },
    { $set: { amenityIds: ids } },
  ).exec();
  console.log(`ROOMTYPES_UPDATED:${res.modifiedCount}`);
  const types = await RoomTypeModel.find({}).select("name amenityIds").exec();
  for (const t of types) {
    console.log(`- ${t.name} linked=${t.amenityIds?.length ?? 0}`);
  }
  await disconnectDatabase();
}

main()
  .then(() => {
    console.log("LINK_DONE");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("LINK_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });

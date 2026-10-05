import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { RatePlanModel } from "../src/modules/ratePlans/rate-plan.model";
import { RoomTypeModel } from "../src/modules/roomTypes/room-type.model";

/**
 * One-off: give every DRAFT £0 Standard Rate a random nightly price and
 * activate it, so cottages appear in search. Run on request only.
 * Replace with real prices in Admin → Rate plans any time.
 */
async function main(): Promise<void> {
  await connectDatabase();
  const plans = await RatePlanModel.find({ status: "DRAFT" }).exec();
  for (const plan of plans) {
    const pounds = 145 + Math.floor(Math.random() * 181); // £145–£325
    plan.pricing.amount = pounds * 100;
    plan.pricing.currency = "GBP";
    plan.status = "ACTIVE";
    await plan.save();
    const room = await RoomTypeModel.findById(plan.roomTypeId).select("name").exec();
    console.log(`ACTIVE:${room?.name || plan._id} £${pounds}/night`);
  }
  await disconnectDatabase();
}

main()
  .then(() => {
    console.log("RATES_DONE");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("RATES_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });

import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { RoomTypeModel } from "../src/modules/roomTypes/room-type.model";

/**
 * One-off: area guide + map pin for the Home Farm cottages.
 * Only fills rooms whose surroundings are still empty — admin edits win.
 * Map pin is central Hamptworth (approximate, adjustable per room).
 */
const SURROUNDINGS = `<p>Information correct at the time of writing:-</p>
<p>The cottages at Home Farm are conveniently located on the border with Wiltshire and Hampshire, so there are lots of opportunities for things to do and days out.</p>
<p>Enjoy the facilities at <strong>Hamptworth Golf &amp; Country Club</strong>, including: Championship golf course, Padel courts, Pickleball courts, Croquet, Clubhouse, restaurant and bar.</p>
<p>Explore the <strong>New Forest National Park</strong> - walk or cycle through ancient woodland, heathland and open moorland - spot the famous free-roaming ponies, cattle and deer. Visit charming villages, traditional pubs and farm shops. Enjoy picnics, nature trails and scenic viewpoints.</p>
<p>Discover <strong>Salisbury</strong> &amp; its history - visit <strong>Salisbury Cathedral</strong>, home to the tallest church spire in Britain, and one of the best-preserved original copies of the Magna Carta - Visit <strong>Mompesson House</strong>, wander Salisbury's independent shops, cafes and restaurants or explore <strong>Old Sarum</strong>, one of southern England's most important historic sites, with its impressive ancient earthworks and panoramic views.</p>
<p>Discover Wiltshire's World Heritage Sites - visit the iconic <strong>Stonehenge</strong>, and explore <strong>Avebury</strong>, home to the world's largest prehistoric stone circle, and discover the rich ancient history that makes this UNESCO World Heritage landscape so special.</p>
<p>Take a trip to <strong>Shaftesbury</strong> and see the famous <strong>Gold Hill</strong>, featured in the classic Hovis advert.</p>
<p>For gardens, heritage &amp; historic houses visit the magnificent gardens at <strong>Stourhead</strong>, explore the picturesque village and historic buildings of <strong>Lacock Abbey</strong>, and wander the beautiful rose gardens and grounds at <strong>Mottisfont</strong>.</p>`;

const MAP_LAT = 50.9622;
const MAP_LNG = -1.7347;

async function main(): Promise<void> {
  await connectDatabase();
  const rooms = await RoomTypeModel.find({}).select("name surroundingsHtml mapLat mapLng").exec();
  for (const room of rooms) {
    const patch: Record<string, unknown> = {};
    if (!room.surroundingsHtml || room.surroundingsHtml.trim().length === 0) {
      patch.surroundingsHtml = SURROUNDINGS;
    }
    if (room.mapLat == null || room.mapLng == null) {
      patch.mapLat = MAP_LAT;
      patch.mapLng = MAP_LNG;
    }
    if (Object.keys(patch).length > 0) {
      await RoomTypeModel.updateOne({ _id: room._id }, { $set: patch }).exec();
      console.log(`SEEDED:${room.name} ${Object.keys(patch).join(",")}`);
    } else {
      console.log(`SKIPPED:${room.name} (already set)`);
    }
  }
  await disconnectDatabase();
}

main()
  .then(() => {
    console.log("SURROUNDINGS_DONE");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("SURROUNDINGS_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });

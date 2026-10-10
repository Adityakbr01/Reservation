import fs from "fs";
import path from "path";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { uploadMedia } from "../src/modules/media/media.service";
import { RoomTypeModel } from "../src/modules/roomTypes/room-type.model";

async function main() {
  await connectDatabase();
  const filePath = path.resolve(__dirname, "../../temp_docx/word/media/image6.jpeg");
  if (!fs.existsSync(filePath)) {
    console.error("Floorplan file not found at", filePath);
    process.exit(1);
  }
  const buffer = fs.readFileSync(filePath);
  console.log("Uploading floorplan image to ImageKit...");
  const media = await uploadMedia({
    data: buffer,
    fileName: "home-farm-hamptworth-floorplan.jpeg",
    mime: "image/jpeg",
    size: buffer.length,
    alt: "Floorplan of Home Farm Hamptworth",
    caption: "Home Farm, Hamptworth, Salisbury, SP5",
    folder: "Cottage/Floorplans",
  });
  console.log("Uploaded successfully! Media ID:", media.id, "URL:", media.url);

  // Attach to room types where floorplanMediaIds is empty
  const res = await RoomTypeModel.updateMany(
    { $or: [{ floorplanMediaIds: { $exists: false } }, { floorplanMediaIds: { $size: 0 } }] },
    { $set: { floorplanMediaIds: [media.id] } }
  );
  console.log("Updated room types with floorplan:", res.modifiedCount);

  await disconnectDatabase();
}

main().catch((err) => {
  console.error("Error uploading floorplan:", err);
  process.exit(1);
});

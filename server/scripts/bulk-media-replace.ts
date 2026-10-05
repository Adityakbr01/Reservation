import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { getImageKit } from "../src/integrations/imagekit/imagekit.client";
import { logger } from "../src/config/logger";
import { MediaModel } from "../src/modules/media/media.model";
import { uploadMedia } from "../src/modules/media/media.service";
import { UserModel } from "../src/modules/users/user.model";

const SOURCE = "C:\\Users\\ADITYA\\AppData\\Local\\Temp\\opencode\\media-resized";

/**
 * One-off library replacement (run on request only, never on boot):
 * 1. Deletes EVERY media row + its ImageKit file (references elsewhere
 *    will show placeholders until re-linked).
 * 2. Uploads each cottage folder as Cottage/<Name>.
 */
async function main(): Promise<void> {
  await connectDatabase();

  const admin = await UserModel.findOne({ role: "admin" }).select("_id").exec();
  if (!admin) throw new Error("No admin user found for createdBy");

  const existing = await MediaModel.find({}).select("_id storageKey fileName").exec();
  console.log(`DELETING:${existing.length}`);
  let deleted = 0;
  for (const doc of existing) {
    try {
      await getImageKit().deleteFile(doc.storageKey);
    } catch (error) {
      logger.warn("ImageKit cleanup skipped", { file: doc.fileName });
      void error;
    }
    await MediaModel.deleteOne({ _id: doc._id }).exec();
    deleted += 1;
  }
  console.log(`DELETED:${deleted}`);

  const entries = await readdir(SOURCE, { withFileTypes: true });
  let uploaded = 0;
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const folder = `Cottage/${entry.name}`;
    const dir = join(SOURCE, entry.name);
    const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
    for (const file of files) {
      const full = join(dir, file);
      const info = await stat(full);
      const data = await readFile(full);
      const media = await uploadMedia({
        data,
        fileName: file,
        mime: "image/jpeg",
        size: info.size,
        folder,
        createdBy: admin._id.toString(),
      });
      uploaded += 1;
      console.log(`UPLOADED:${uploaded} ${folder}/${file} -> ${media.id}`);
    }
  }
  console.log(`UPLOAD_DONE:${uploaded}`);
  await disconnectDatabase();
}

main()
  .then(() => {
    console.log("BULK_DONE");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("BULK_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });

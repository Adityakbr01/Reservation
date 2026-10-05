import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getImageKit } from "../src/integrations/imagekit/imagekit.client";

async function main(): Promise<void> {
  const dir = "C:\\Users\\ADITYA\\AppData\\Local\\Temp\\opencode\\media-resized\\Fern Cottage";
  const first = (await readdir(dir)).filter((f) => /\.jpe?g$/i.test(f)).sort()[0] as string;
  const data = await readFile(join(dir, first));
  console.log(`PROBE_FILE:${first} size=${data.length}`);
  try {
    const result = await getImageKit().upload({
      file: data,
      fileName: `probe-${Date.now()}.jpg`,
      folder: "reservation/media/Cottage/Fern Cottage",
    });
    console.log(`UPLOAD_OK url=${result.url} id=${result.fileId}`);
    await getImageKit().deleteFile(result.fileId);
    console.log("PROBE_CLEANED");
  } catch (error: unknown) {
    console.log(`UPLOAD_FAIL message=${error instanceof Error ? error.message : String(error)}`);
    console.log(`UPLOAD_FAIL detail=${JSON.stringify(error).slice(0, 500)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("PROBE_CRASH", error instanceof Error ? error.message : error);
    process.exit(1);
  });

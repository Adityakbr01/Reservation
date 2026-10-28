import { readFileSync, writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function escapeSqlString(val: string): string {
  return val
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z");
}

function formatSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const padMs = (n: number) => String(n).padStart(3, "0");
    return `'${val.getUTCFullYear()}-${pad(val.getUTCMonth() + 1)}-${pad(val.getUTCDate())} ${pad(val.getUTCHours())}:${pad(val.getUTCMinutes())}:${pad(val.getUTCSeconds())}.${padMs(val.getUTCMilliseconds())}'`;
  }
  if (typeof val === "object") {
    return `'${escapeSqlString(JSON.stringify(val))}'`;
  }
  return `'${escapeSqlString(String(val))}'`;
}

async function main() {
  const origDump = readFileSync("backups/reservation_mysql_dump.sql", "utf8");

  // Fetch updated data from live database
  const liveAmenities = await prisma.amenity.findMany({ orderBy: { sortOrder: "asc" } });
  const liveMedia = await prisma.media.findMany({ orderBy: { createdAt: "asc" } });
  const liveRatePlans = await prisma.ratePlan.findMany({ orderBy: { createdAt: "asc" } });
  const liveRoomTypes = await prisma.roomType.findMany({ orderBy: { createdAt: "asc" } });

  console.log(`Live amenities: ${liveAmenities.length}`);
  console.log(`Live media: ${liveMedia.length}`);
  console.log(`Live rateplans: ${liveRatePlans.length}`);
  console.log(`Live roomtypes: ${liveRoomTypes.length}`);

  const amenityRows = liveAmenities.map(a => 
    `(${formatSqlValue(a.id)},${formatSqlValue(a.name)},${formatSqlValue(a.slug)},${formatSqlValue(a.group)},${formatSqlValue(a.description)},${formatSqlValue(a.imageMediaId)},${formatSqlValue(a.iconUrl)},${a.sortOrder},${formatSqlValue(a.status)},${formatSqlValue(a.createdAt)},${formatSqlValue(a.updatedAt)})`
  );
  const newAmenitiesInsert = `INSERT INTO \`amenities\` VALUES ${amenityRows.join(",")};`;

  const mediaRows = liveMedia.map(m => 
    `(${formatSqlValue(m.id)},${formatSqlValue(m.fileName)},${formatSqlValue(m.url)},${formatSqlValue(m.storageKey)},${formatSqlValue(m.storageProvider)},${formatSqlValue(m.legacyUrl)},${formatSqlValue(m.legacyStorageKey)},${formatSqlValue(m.mime)},${formatSqlValue(m.kind)},${formatSqlValue(m.folder)},${formatSqlValue(m.width)},${formatSqlValue(m.height)},${formatSqlValue(m.durationSec)},${formatSqlValue(m.alt)},${formatSqlValue(m.caption)},${m.size},${formatSqlValue(m.createdBy)},${formatSqlValue(m.createdAt)},${formatSqlValue(m.updatedAt)})`
  );
  const newMediaInsert = `INSERT INTO \`media\` VALUES ${mediaRows.join(",")};`;

  const ratePlanRows = liveRatePlans.map(r => 
    `(${formatSqlValue(r.id)},${formatSqlValue(r.propertyId)},${formatSqlValue(r.roomTypeId)},${formatSqlValue(r.name)},${formatSqlValue(r.slug)},${formatSqlValue(r.description)},${formatSqlValue(r.pricing)},${formatSqlValue(r.restrictions)},${formatSqlValue(r.cancellationPolicyId)},${formatSqlValue(r.status)},${formatSqlValue(r.createdAt)},${formatSqlValue(r.updatedAt)})`
  );
  const newRatePlansInsert = `INSERT INTO \`rateplans\` VALUES ${ratePlanRows.join(",")};`;

  const roomTypeRows = liveRoomTypes.map(rt => 
    `(${formatSqlValue(rt.id)},${formatSqlValue(rt.propertyId)},${formatSqlValue(rt.name)},${formatSqlValue(rt.slug)},${formatSqlValue(rt.shortDescription)},${formatSqlValue(rt.description)},${rt.maxAdults},${rt.maxChildren},${rt.maxOccupancy},${formatSqlValue(rt.beds)},${formatSqlValue(rt.amenities)},${formatSqlValue(rt.images)},${formatSqlValue(rt.media)},${formatSqlValue(rt.propertyDetailsHtml)},${formatSqlValue(rt.layoutHtml)},${formatSqlValue(rt.floorplanMediaIds)},${formatSqlValue(rt.locationText)},${formatSqlValue(rt.surroundingsHtml)},${formatSqlValue(rt.mapLat)},${formatSqlValue(rt.mapLng)},${formatSqlValue(rt.mapEmbedUrl)},${rt.welcomeHamperIncluded ? 1 : 0},${formatSqlValue(rt.welcomeHamperDescription)},${formatSqlValue(rt.welcomeHamperImageMediaId)},${formatSqlValue(rt.welcomeHamperHtml)},${formatSqlValue(rt.amenityIds)},${formatSqlValue(rt.nearbyAttractions)},${formatSqlValue(rt.bedrooms)},${formatSqlValue(rt.bathrooms)},${formatSqlValue(rt.maxDogs)},${formatSqlValue(rt.status)},${formatSqlValue(rt.seo)},${formatSqlValue(rt.createdAt)},${formatSqlValue(rt.updatedAt)})`
  );
  const newRoomTypesInsert = `INSERT INTO \`roomtypes\` VALUES ${roomTypeRows.join(",")};`;

  // Function to replace a table's data block using exact table bounds:
  // From "-- Dumping data for table `tableName`" to the next "-- Table structure for table" or "-- Dump completed"
  function replaceTableData(sql: string, table: string, newInsert: string): string {
    const startMarker = `--\n-- Dumping data for table \`${table}\`\n--\n`;
    const startIndex = sql.indexOf(startMarker);
    if (startIndex === -1) {
      throw new Error(`Start marker not found for table ${table}`);
    }

    // Find end marker (the next "-- Table structure" or "-- Dump completed")
    const nextTableMarker = sql.indexOf(`\n--\n-- Table structure for table `, startIndex + startMarker.length);
    const endMarkerIndex = nextTableMarker !== -1 ? nextTableMarker : sql.indexOf(`\n-- Dump completed`, startIndex);
    if (endMarkerIndex === -1) {
      throw new Error(`End marker not found for table ${table}`);
    }

    const before = sql.slice(0, startIndex + startMarker.length);
    const after = sql.slice(endMarkerIndex);
    return before + `\n${newInsert}\n` + after;
  }

  let result = origDump;
  result = replaceTableData(result, "amenities", newAmenitiesInsert);
  result = replaceTableData(result, "media", newMediaInsert);
  result = replaceTableData(result, "rateplans", newRatePlansInsert);
  result = replaceTableData(result, "roomtypes", newRoomTypesInsert);

  // Now remove LOCK TABLES, UNLOCK TABLES, and conditional comments for ALL tables safely
  result = result
    .replace(/LOCK TABLES [^;]+;\r?\n/g, "")
    .replace(/UNLOCK TABLES;\r?\n/g, "")
    .replace(/\/\*![0-9]+ ALTER TABLE [^;]+ DISABLE KEYS \*\/;\r?\n/g, "")
    .replace(/\/\*![0-9]+ ALTER TABLE [^;]+ ENABLE KEYS \*\/;\r?\n/g, "")
    .replace(/\/\*![0-9]+ [^;]+\*\/;\r?\n/g, "")
    .replace(/\/\*![0-9]+ [^\*]+\*\//g, "");

  writeFileSync("backups/clean_import.sql", result, "utf8");
  console.log(`Successfully generated backups/clean_import.sql (${result.length} bytes)`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

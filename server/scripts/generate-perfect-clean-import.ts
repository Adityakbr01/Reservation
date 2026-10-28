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

  // Step 1: Clean out LOCK TABLES, UNLOCK TABLES, and /*!...*/ comments exactly like step 1722
  let cleaned = origDump
    .replace(/LOCK TABLES [^;]+;\r?\n/g, "")
    .replace(/UNLOCK TABLES;\r?\n/g, "")
    .replace(/\/\*![0-9]+ [^;]+\*\/;\r?\n/g, "")
    .replace(/\/\*![0-9]+ [^\*]+\*\//g, "");

  // Step 2: Query the live database for the 4 tables that have updated data
  // Table 1: amenities
  const liveAmenities = await prisma.amenity.findMany({ orderBy: { sortOrder: "asc" } });
  console.log(`Fetched ${liveAmenities.length} live amenities`);
  const amenityRows = liveAmenities.map(a => {
    return `(${formatSqlValue(a.id)},${formatSqlValue(a.name)},${formatSqlValue(a.slug)},${formatSqlValue(a.group)},${formatSqlValue(a.description)},${formatSqlValue(a.imageMediaId)},${formatSqlValue(a.iconUrl)},${a.sortOrder},${formatSqlValue(a.status)},${formatSqlValue(a.createdAt)},${formatSqlValue(a.updatedAt)})`;
  });
  const newAmenitiesInsert = `INSERT INTO \`amenities\` VALUES ${amenityRows.join(",")};`;

  // Table 2: media
  const liveMedia = await prisma.media.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`Fetched ${liveMedia.length} live media items`);
  const mediaRows = liveMedia.map(m => {
    return `(${formatSqlValue(m.id)},${formatSqlValue(m.fileName)},${formatSqlValue(m.url)},${formatSqlValue(m.storageKey)},${formatSqlValue(m.storageProvider)},${formatSqlValue(m.legacyUrl)},${formatSqlValue(m.legacyStorageKey)},${formatSqlValue(m.mime)},${formatSqlValue(m.kind)},${formatSqlValue(m.folder)},${formatSqlValue(m.width)},${formatSqlValue(m.height)},${formatSqlValue(m.durationSec)},${formatSqlValue(m.alt)},${formatSqlValue(m.caption)},${m.size},${formatSqlValue(m.createdBy)},${formatSqlValue(m.createdAt)},${formatSqlValue(m.updatedAt)})`;
  });
  const newMediaInsert = `INSERT INTO \`media\` VALUES ${mediaRows.join(",")};`;

  // Table 3: rateplans
  const liveRatePlans = await prisma.ratePlan.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`Fetched ${liveRatePlans.length} live rate plans`);
  const ratePlanRows = liveRatePlans.map(r => {
    return `(${formatSqlValue(r.id)},${formatSqlValue(r.propertyId)},${formatSqlValue(r.roomTypeId)},${formatSqlValue(r.name)},${formatSqlValue(r.slug)},${formatSqlValue(r.description)},${formatSqlValue(r.pricing)},${formatSqlValue(r.restrictions)},${formatSqlValue(r.cancellationPolicyId)},${formatSqlValue(r.status)},${formatSqlValue(r.createdAt)},${formatSqlValue(r.updatedAt)})`;
  });
  const newRatePlansInsert = `INSERT INTO \`rateplans\` VALUES ${ratePlanRows.join(",")};`;

  // Table 4: roomtypes
  const liveRoomTypes = await prisma.roomType.findMany({ orderBy: { createdAt: "asc" } });
  console.log(`Fetched ${liveRoomTypes.length} live room types`);
  const roomTypeRows = liveRoomTypes.map(rt => {
    return `(${formatSqlValue(rt.id)},${formatSqlValue(rt.propertyId)},${formatSqlValue(rt.name)},${formatSqlValue(rt.slug)},${formatSqlValue(rt.shortDescription)},${formatSqlValue(rt.description)},${rt.maxAdults},${rt.maxChildren},${rt.maxOccupancy},${formatSqlValue(rt.beds)},${formatSqlValue(rt.amenities)},${formatSqlValue(rt.images)},${formatSqlValue(rt.media)},${formatSqlValue(rt.propertyDetailsHtml)},${formatSqlValue(rt.layoutHtml)},${formatSqlValue(rt.floorplanMediaIds)},${formatSqlValue(rt.locationText)},${formatSqlValue(rt.surroundingsHtml)},${formatSqlValue(rt.mapLat)},${formatSqlValue(rt.mapLng)},${formatSqlValue(rt.mapEmbedUrl)},${rt.welcomeHamperIncluded ? 1 : 0},${formatSqlValue(rt.welcomeHamperDescription)},${formatSqlValue(rt.welcomeHamperImageMediaId)},${formatSqlValue(rt.welcomeHamperHtml)},${formatSqlValue(rt.amenityIds)},${formatSqlValue(rt.nearbyAttractions)},${formatSqlValue(rt.bedrooms)},${formatSqlValue(rt.bathrooms)},${formatSqlValue(rt.maxDogs)},${formatSqlValue(rt.status)},${formatSqlValue(rt.seo)},${formatSqlValue(rt.createdAt)},${formatSqlValue(rt.updatedAt)})`;
  });
  const newRoomTypesInsert = `INSERT INTO \`roomtypes\` VALUES ${roomTypeRows.join(",")};`;

  // Replace each INSERT INTO in the cleaned SQL
  cleaned = cleaned.replace(/INSERT INTO `amenities` VALUES [\s\S]+?;/, newAmenitiesInsert);
  cleaned = cleaned.replace(/INSERT INTO `media` VALUES [\s\S]+?;/, newMediaInsert);
  cleaned = cleaned.replace(/INSERT INTO `rateplans` VALUES [\s\S]+?;/, newRatePlansInsert);
  cleaned = cleaned.replace(/INSERT INTO `roomtypes` VALUES [\s\S]+?;/, newRoomTypesInsert);

  // Write to backups/clean_import.sql
  writeFileSync("backups/clean_import.sql", cleaned, "utf8");
  console.log(`WROTE backups/clean_import.sql (${cleaned.length} bytes)`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

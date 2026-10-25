import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma, disconnectDatabase, connectDatabase } from "../src/config/database";
import { env } from "../src/config/env";

/**
 * MySQL Database Backup Script via Prisma.
 * Exports all tables from the active MySQL database into timestamped JSON files.
 *
 * Usage:
 *   bun scripts/backup-db.ts [--out <dir>]
 */

interface BackupManifest {
  createdAt: string;
  database: string;
  totalCollections: number;
  totalDocuments: number;
  collections: Record<
    string,
    {
      count: number;
      file: string;
      sizeBytes: number;
    }
  >;
}

const MODELS: Array<{ name: string; findMany: () => Promise<any[]> }> = [
  { name: "users", findMany: () => prisma.user.findMany() },
  { name: "properties", findMany: () => prisma.property.findMany() },
  { name: "amenities", findMany: () => prisma.amenity.findMany() },
  { name: "roomtypes", findMany: () => prisma.roomType.findMany() },
  { name: "rooms", findMany: () => prisma.room.findMany() },
  { name: "rateplans", findMany: () => prisma.ratePlan.findMany() },
  { name: "dailyprices", findMany: () => prisma.dailyPrice.findMany() },
  { name: "cancellationpolicies", findMany: () => prisma.policy.findMany() },
  { name: "availabilityblocks", findMany: () => prisma.availabilityBlock.findMany() },
  { name: "coupons", findMany: () => prisma.coupon.findMany() },
  { name: "bookings", findMany: () => prisma.booking.findMany() },
  { name: "bookingitems", findMany: () => prisma.bookingItem.findMany() },
  { name: "payments", findMany: () => prisma.payment.findMany() },
  { name: "refunds", findMany: () => prisma.refund.findMany() },
  { name: "reviews", findMany: () => prisma.review.findMany() },
  { name: "media", findMany: () => prisma.media.findMany() },
  { name: "sitesettings", findMany: () => prisma.siteSettings.findMany() },
  { name: "emailtemplates", findMany: () => prisma.emailTemplate.findMany() },
  { name: "enquiries", findMany: () => prisma.enquiry.findMany() },
  { name: "newslettersubscribers", findMany: () => prisma.newsletterSubscriber.findMany() },
  { name: "notifications", findMany: () => prisma.notification.findMany() },
  { name: "auditlogs", findMany: () => prisma.auditLog.findMany() },
  { name: "webhookevents", findMany: () => prisma.webhookEvent.findMany() },
  { name: "cmspages", findMany: () => prisma.cmsPage.findMany() },
  { name: "cmsblogposts", findMany: () => prisma.cmsBlogPost.findMany() },
  { name: "cmsfaqs", findMany: () => prisma.cmsFaq.findMany() },
  { name: "cmsoffers", findMany: () => prisma.cmsOffer.findMany() },
  { name: "cmspolicydocs", findMany: () => prisma.cmsPolicyDoc.findMany() },
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let customOutDir: string | null = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out" && args[i + 1]) {
      customOutDir = args[i + 1];
      i += 1;
    }
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const backupDir = customOutDir
    ? resolve(process.cwd(), customOutDir)
    : resolve(process.cwd(), "backups", `backup-${timestamp}`);

  await mkdir(backupDir, { recursive: true });

  console.log(`\n==================================================`);
  console.log(`Starting MySQL Database Backup (via Prisma)`);
  console.log(`Directory: ${backupDir}`);
  console.log(`==================================================\n`);

  await connectDatabase();

  const manifest: BackupManifest = {
    createdAt: now.toISOString(),
    database: "MySQL (reservation)",
    totalCollections: MODELS.length,
    totalDocuments: 0,
    collections: {},
  };

  for (const { name, findMany } of MODELS) {
    const rows = await findMany();
    const count = rows.length;
    manifest.totalDocuments += count;

    const fileName = `${name}.json`;
    const filePath = resolve(backupDir, fileName);

    const serialized = JSON.stringify(rows, null, 2);
    const buffer = Buffer.from(serialized, "utf-8");
    await writeFile(filePath, buffer);

    manifest.collections[name] = {
      count,
      file: fileName,
      sizeBytes: buffer.byteLength,
    };

    const sizeKb = (buffer.byteLength / 1024).toFixed(1);
    console.log(`  ✓ ${name.padEnd(25)} : ${String(count).padStart(5)} rows (${sizeKb} KB)`);
  }

  const manifestPath = resolve(backupDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("\n--------------------------------------------------");
  console.log(`✅ Backup completed successfully!`);
  console.log(`Total tables     : ${manifest.totalCollections}`);
  console.log(`Total rows       : ${manifest.totalDocuments}`);
  console.log(`Backup location  : ${backupDir}`);
  console.log(`Manifest file    : ${manifestPath}`);
  console.log("--------------------------------------------------\n");

  await disconnectDatabase();
}

main()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("\n❌ BACKUP FAILED:", error instanceof Error ? error.message : error);
    try {
      await disconnectDatabase();
    } catch {
      // ignore
    }
    process.exit(1);
  });

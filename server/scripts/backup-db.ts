import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { disconnectDatabase } from "../src/config/database";
import { env } from "../src/config/env";

/**
 * MongoDB Database Backup Script.
 *
 * Exports all non-system collections from the active MongoDB database into
 * timestamped JSON files using Extended JSON (EJSON) format to preserve
 * exact BSON types (ObjectIds, Dates, regexes, decimals).
 *
 * Usage:
 *   bun scripts/backup-db.ts [--out <dir>]
 */

interface BackupManifest {
  createdAt: string;
  database: string;
  connectionHost: string;
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

function sanitizeMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return uri.replace(/:([^@]+)@/, ":***@");
  }
}

async function connectForBackup(): Promise<string> {
  // 1. Try standard connection
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      maxPoolSize: 5,
    });
    return env.MONGODB_URI;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Standard connection attempt: ${msg}`);
    console.log("Attempting direct connection to responsive cluster nodes for read backup...");

    // Extract user/password and db name from MONGODB_URI
    const shardHosts = [
      "cluster0-shard-00-00.whbog.mongodb.net:27017",
      "cluster0-shard-00-01.whbog.mongodb.net:27017",
      "cluster0-shard-00-02.whbog.mongodb.net:27017",
    ];

    for (const host of shardHosts) {
      try {
        let fallbackUri = env.MONGODB_URI;
        if (fallbackUri.includes("@") && fallbackUri.includes("/")) {
          fallbackUri =
            fallbackUri.replace(/@([^/]+)\//, `@${host}/`).split("?")[0] +
            "?ssl=true&authSource=admin&directConnection=true&readPreference=secondaryPreferred";
        }
        await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 4000,
          maxPoolSize: 5,
        });
        console.log(`Connected directly to node: ${host}`);
        return fallbackUri;
      } catch {
        // try next node
      }
    }
    throw new Error("Unable to connect to any MongoDB cluster node for backup");
  }
}

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
  console.log(`Starting MongoDB Backup`);
  console.log(`Target: ${sanitizeMongoUri(env.MONGODB_URI)}`);
  console.log(`Directory: ${backupDir}`);
  console.log(`==================================================\n`);

  const activeUri = await connectForBackup();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Mongoose connection established but database object is undefined");
  }

  const dbName = db.databaseName;
  console.log(`Connected to database: "${dbName}"\n`);

  // Fetch all collection names
  const rawCollections = await db.listCollections().toArray();
  const collectionNames = rawCollections
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."))
    .sort();

  console.log(`Found ${collectionNames.length} collections. Exporting...\n`);

  const manifest: BackupManifest = {
    createdAt: now.toISOString(),
    database: dbName,
    connectionHost: sanitizeMongoUri(activeUri),
    totalCollections: collectionNames.length,
    totalDocuments: 0,
    collections: {},
  };

  const EJSON = mongoose.mongo.BSON.EJSON;

  for (const name of collectionNames) {
    const col = db.collection(name);
    const docs = await col.find({}).toArray();
    const count = docs.length;
    manifest.totalDocuments += count;

    const fileName = `${name}.json`;
    const filePath = resolve(backupDir, fileName);

    // Format with EJSON canonical format for lossless ObjectId/Date/Regex support
    const serialized = EJSON.stringify(docs, undefined, 2, { relaxed: false });
    const buffer = Buffer.from(serialized, "utf-8");
    await writeFile(filePath, buffer);

    manifest.collections[name] = {
      count,
      file: fileName,
      sizeBytes: buffer.byteLength,
    };

    const sizeKb = (buffer.byteLength / 1024).toFixed(1);
    console.log(`  ✓ ${name.padEnd(25)} : ${String(count).padStart(5)} docs (${sizeKb} KB)`);
  }

  const manifestPath = resolve(backupDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  console.log("\n--------------------------------------------------");
  console.log(`✅ Backup completed successfully!`);
  console.log(`Total collections : ${manifest.totalCollections}`);
  console.log(`Total documents   : ${manifest.totalDocuments}`);
  console.log(`Backup location   : ${backupDir}`);
  console.log(`Manifest file     : ${manifestPath}`);
  console.log("--------------------------------------------------\n");

  await disconnectDatabase();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n❌ BACKUP FAILED:", error instanceof Error ? error.message : error);
    try {
      await disconnectDatabase();
    } catch {
      // ignore
    }
    process.exit(1);
  });

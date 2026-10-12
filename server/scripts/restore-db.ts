import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { disconnectDatabase } from "../src/config/database";
import { env } from "../src/config/env";

/**
 * MongoDB Database Restore Script.
 *
 * Restores collections and documents exported by backup-db.ts.
 *
 * Usage:
 *   bun scripts/restore-db.ts [--dir <backup-dir>] [--drop] [--apply]
 *
 * Safety:
 *   - Dry-run by default. Pass --apply to execute writes.
 *   - Use --drop to drop collections before importing (default: inserts only non-duplicate docs).
 */

async function connectForRestore(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 5,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Standard connection attempt: ${msg}`);
    console.log("Attempting direct connection to responsive cluster nodes...");

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
            "?ssl=true&authSource=admin&directConnection=true";
        }
        await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 4000,
          maxPoolSize: 5,
        });
        console.log(`Connected directly to node: ${host}`);
        return;
      } catch {
        // try next
      }
    }
    throw new Error("Unable to connect to any MongoDB cluster node for restore");
  }
}

async function findLatestBackupDir(): Promise<string | null> {
  const backupsRoot = resolve(process.cwd(), "backups");
  try {
    const entries = await readdir(backupsRoot, { withFileTypes: true });
    const backupDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("backup-"))
      .map((e) => e.name)
      .sort()
      .reverse();

    if (backupDirs.length === 0) return null;
    return resolve(backupsRoot, backupDirs[0]);
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let dirArg: string | null = null;
  let apply = false;
  let drop = false;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--dir" && args[i + 1]) {
      dirArg = args[i + 1];
      i += 1;
    } else if (args[i] === "--apply") {
      apply = true;
    } else if (args[i] === "--drop") {
      drop = true;
    }
  }

  const backupDir = dirArg ? resolve(process.cwd(), dirArg) : await findLatestBackupDir();

  if (!backupDir) {
    throw new Error("No backup directory found in backups/. Specify with --dir <path>");
  }

  const manifestPath = resolve(backupDir, "manifest.json");
  const manifestRaw = await readFile(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw);

  console.log(`\n==================================================`);
  console.log(`MongoDB Restore Tool ${apply ? "(APPLYING WRITES)" : "(DRY RUN)"}`);
  console.log(`Source backup : ${backupDir}`);
  console.log(`Created at    : ${manifest.createdAt}`);
  console.log(`Collections   : ${manifest.totalCollections}`);
  console.log(`Documents     : ${manifest.totalDocuments}`);
  console.log(`Mode          : ${drop ? "DROP existing collections before import" : "INSERT missing docs"}`);
  console.log(`==================================================\n`);

  if (!apply) {
    console.log("⚠️ DRY RUN MODE: No changes will be written. Pass --apply to execute.\n");
  }

  await connectForRestore();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database object available");

  const EJSON = mongoose.mongo.BSON.EJSON;

  for (const [colName, info] of Object.entries<any>(manifest.collections)) {
    const filePath = resolve(backupDir, info.file);
    const content = await readFile(filePath, "utf-8");
    const docs = EJSON.parse(content) as any[];

    if (!Array.isArray(docs)) {
      console.warn(`  ⚠️ Skipping ${colName}: unexpected JSON structure`);
      continue;
    }

    if (!apply) {
      console.log(`  [DRY-RUN] ${colName.padEnd(25)} : would restore ${docs.length} docs`);
      continue;
    }

    const col = db.collection(colName);
    if (drop) {
      try {
        await col.drop();
      } catch {
        // ignore collection not found
      }
    }

    if (docs.length > 0) {
      // Chunk inserts in batches of 500
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        try {
          const res = await col.insertMany(batch, { ordered: false });
          inserted += res.insertedCount;
        } catch (err: any) {
          // If not drop, duplicate key errors are tolerated
          if (err?.insertedDocs?.length) {
            inserted += err.insertedDocs.length;
          }
        }
      }
      console.log(`  ✓ ${colName.padEnd(25)} : restored ${inserted}/${docs.length} docs`);
    } else {
      console.log(`  ✓ ${colName.padEnd(25)} : 0 docs`);
    }
  }

  console.log("\n--------------------------------------------------");
  if (apply) {
    console.log("✅ Restore completed successfully!");
  } else {
    console.log("ℹ️ Dry-run completed. Run with --apply to perform actual restore.");
  }
  console.log("--------------------------------------------------\n");

  await disconnectDatabase();
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("\n❌ RESTORE FAILED:", err instanceof Error ? err.message : err);
    try {
      await disconnectDatabase();
    } catch {
      // ignore
    }
    process.exit(1);
  });

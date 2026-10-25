import { readFile, writeFile } from "node:fs/promises";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { env } from "../src/config/env";
import { logger } from "../src/config/logger";
import { buildAvatarKey, buildMediaKey, publicAssetUrl, storagePrefixSegments } from "../src/integrations/storage/storage-keys";
import {
  removeFileFromGoDaddy,
  uploadBufferToGoDaddy,
} from "../src/integrations/storage/godaddy-storage";
import { MediaModel } from "../src/modules/media/media.model";
import { UserModel } from "../src/modules/users/user.model";
import {
  BlogPostModel,
  FaqModel,
  OfferModel,
  PageModel,
  PolicyDocModel,
} from "../src/modules/cms/cms.model";
import { RoomTypeModel } from "../src/modules/roomTypes/room-type.model";
import { SiteSettingsModel } from "../src/modules/settings/settings.model";

/**
 * One-off ImageKit → GoDaddy backfill (see migrate-imagekit-to-godaddy.md).
 *
 *   bun scripts/migrate-media-to-godaddy.ts --kind media|avatars|html|rekey|all [--apply] [--limit N] [--only <id>] [--map ./url-map.json]
 *
 * Dry-run by default: without --apply nothing is uploaded and nothing is
 * written to Mongo. Re-runnable: rows already on "local" are skipped, so a
 * failed batch resumes by re-running the same command. Rollback per row via
 * the legacyUrl / legacyStorageKey fields (old ImageKit files are NOT deleted
 * here — Phase 4 does that after acceptance).
 */

interface Args {
  kind: "media" | "avatars" | "html" | "rekey" | "all";
  apply: boolean;
  limit: number;
  only: string | null;
  mapPath: string;
  concurrency: number;
}

interface UrlMapEntry {
  mediaId: string;
  oldUrl: string;
  newUrl: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { kind: "all", apply: false, limit: 0, only: null, mapPath: "./url-map.json", concurrency: 5 };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--kind" && (value === "media" || value === "avatars" || value === "html" || value === "rekey" || value === "all")) {
      args.kind = value;
      i += 1;
    } else if (flag === "--apply") {
      args.apply = true;
    } else if (flag === "--limit" && value) {
      args.limit = Math.max(0, Number.parseInt(value, 10) || 0);
      i += 1;
    } else if (flag === "--concurrency" && value) {
      args.concurrency = Math.max(1, Number.parseInt(value, 10) || 5);
      i += 1;
    } else if (flag === "--only" && value) {
      args.only = value;
      i += 1;
    } else if (flag === "--map" && value) {
      args.mapPath = value;
      i += 1;
    }
  }
  return args;
}

function requireFtpConfig(): string {
  const baseUrl = env.ASSETS_BASE_URL;
  if (!env.GODADDY_FTP_HOST || !env.GODADDY_FTP_USER || !env.GODADDY_FTP_PASSWORD || !baseUrl) {
    throw new Error(
      "Backfill needs GODADDY_FTP_HOST/USER/PASSWORD + ASSETS_BASE_URL in the environment.",
    );
  }
  return baseUrl;
}

async function downloadBinary(url: string): Promise<{ data: Buffer; contentType: string | null }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`download HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type");
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length === 0) {
    throw new Error("downloaded 0 bytes");
  }
  if (contentType?.startsWith("text/html")) {
    throw new Error(`unexpected content-type ${contentType} (stale URL?)`);
  }
  return { data, contentType };
}

async function verifyPublicUrl(url: string, expectedBytes: number): Promise<void> {
  // GoDaddy shared hosting can take a moment before a fresh FTP upload is
  // served over HTTP — poll with quick backoff instead of failing immediately.
  const attempts = 10;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      lastStatus = response.status;
      if (response.ok) {
        const data = Buffer.from(await response.arrayBuffer());
        if (data.length !== expectedBytes) {
          throw new Error(`verify size mismatch (expected ${expectedBytes}, got ${data.length})`);
        }
        if (attempt > 1) console.log(`VERIFY_OK_AFTER_RETRY:${attempt} ${url}`);
        return;
      }
    } catch (error) {
      if (attempt === attempts) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`verify HTTP ${lastStatus} after ${attempts} attempts`);
}

/** Lightweight concurrent runner: runs up to limit workers in parallel. */
async function pMap<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let currentIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Preflight: proves ASSETS_BASE_URL actually serves the FTP jail BEFORE any
 * row is touched. A wrong base (e.g. missing /uploads path) fails here with a
 * clear message instead of mass-skipping every row at verify time.
 */
async function preflightCheck(baseUrl: string): Promise<void> {
  const key = `media/preflight-${Date.now()}.txt`;
  const probe = Buffer.from("preflight");
  await uploadBufferToGoDaddy(key, probe);
  try {
    await verifyPublicUrl(publicAssetUrl(baseUrl, key), probe.length);
  } finally {
    await removeFileFromGoDaddy(key).catch(() => undefined);
  }
  console.log(`PREFLIGHT_OK:${publicAssetUrl(baseUrl, key)}`);
}

async function loadMap(mapPath: string): Promise<UrlMapEntry[]> {
  try {
    const raw = await readFile(mapPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UrlMapEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveMap(mapPath: string, entries: UrlMapEntry[]): Promise<void> {
  const existing = await loadMap(mapPath);
  const byOld = new Map(existing.map((entry) => [entry.oldUrl, entry]));
  for (const entry of entries) byOld.set(entry.oldUrl, entry);
  await writeFile(mapPath, `${JSON.stringify([...byOld.values()], null, 2)}\n`, "utf8");
}

/** Rows predating the migration lack storageProvider — treat missing as imagekit. */
function legacyProviderQuery() {
  return { $or: [{ storageProvider: "imagekit" }, { storageProvider: { $exists: false } }] };
}

async function runMedia(args: Args, baseUrl: string): Promise<UrlMapEntry[]> {
  const filter = args.only
    ? { _id: args.only }
    : legacyProviderQuery();
  const query = MediaModel.find(filter).sort({ createdAt: 1 });
  if (args.limit > 0) query.limit(args.limit);
  const rows = await query.exec();
  console.log(`MEDIA_CANDIDATES:${rows.length}`);
  const mapped: UrlMapEntry[] = [];
  let done = 0;
  const concurrency = args.concurrency || 5;

  await pMap(rows, concurrency, async (row) => {
    const tag = args.apply ? "MIGRATED" : "DRYRUN";
    try {
      const { data } = await downloadBinary(row.url);
      const key = buildMediaKey(row.fileName, row.mime);
      const newUrl = publicAssetUrl(baseUrl, key);
      if (args.apply) {
        await uploadBufferToGoDaddy(key, data);
        try {
          await verifyPublicUrl(newUrl, data.length);
        } catch (error) {
          await removeFileFromGoDaddy(key).catch(() => undefined);
          throw error;
        }
        await MediaModel.findByIdAndUpdate(row._id, {
          $set: {
            url: newUrl,
            storageKey: key,
            storageProvider: "local",
            legacyUrl: row.url,
            legacyStorageKey: row.storageKey,
          },
        }).exec();
      }
      mapped.push({ mediaId: row._id.toString(), oldUrl: row.url, newUrl });
      done += 1;
      console.log(`${tag}:${done}/${rows.length} ${row.fileName} -> ${newUrl}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Media backfill skipped", { id: row._id.toString(), message });
      console.log(`SKIPPED:${row._id.toString()} ${message}`);
    }
  });

  console.log(`MEDIA_DONE:${done}/${rows.length}`);
  return mapped;
}

const AVATAR_CONTENT_TO_MIME: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

async function runAvatars(args: Args, baseUrl: string): Promise<void> {
  const filter = args.only
    ? { _id: args.only }
    : {
        avatarFileId: { $ne: null },
        $or: [{ avatarStorageProvider: "imagekit" }, { avatarStorageProvider: { $exists: false } }],
      };
  const query = UserModel.find(filter).sort({ createdAt: 1 });
  if (args.limit > 0) query.limit(args.limit);
  const rows = await query.select("+avatarFileId +legacyAvatarFileId").exec();
  console.log(`AVATAR_CANDIDATES:${rows.length}`);
  let done = 0;
  const concurrency = args.concurrency || 5;

  await pMap(rows, concurrency, async (row) => {
    try {
      if (!row.avatarUrl || !row.avatarFileId) {
        console.log(`SKIPPED:${row._id.toString()} no avatar refs`);
        return;
      }
      const { data, contentType } = await downloadBinary(row.avatarUrl);
      const mime = (contentType?.split(";")[0].trim() ?? "") as string;
      const resolved = AVATAR_CONTENT_TO_MIME[mime];
      if (!resolved) {
        console.log(`SKIPPED:${row._id.toString()} unsupported avatar type ${contentType}`);
        return;
      }
      const key = buildAvatarKey(row._id.toString(), "avatar", resolved);
      const newUrl = publicAssetUrl(baseUrl, key);
      if (args.apply) {
        await uploadBufferToGoDaddy(key, data);
        try {
          await verifyPublicUrl(newUrl, data.length);
        } catch (error) {
          await removeFileFromGoDaddy(key).catch(() => undefined);
          throw error;
        }
        await UserModel.findByIdAndUpdate(row._id, {
          $set: {
            avatarUrl: newUrl,
            avatarFileId: key,
            avatarStorageProvider: "local",
            legacyAvatarUrl: row.avatarUrl,
            legacyAvatarFileId: row.avatarFileId,
          },
        }).exec();
      }
      done += 1;
      console.log(`${args.apply ? "MIGRATED" : "DRYRUN"}:${done}/${rows.length} user ${row._id.toString()} -> ${newUrl}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Avatar backfill skipped", { id: row._id.toString(), message });
      console.log(`SKIPPED:${row._id.toString()} ${message}`);
    }
  });

  console.log(`AVATAR_DONE:${done}/${rows.length}`);
}

function replaceAllOccurrences(text: string, map: UrlMapEntry[]): { text: string; count: number } {  let count = 0;
  let out = text;
  for (const entry of map) {
    if (out.includes(entry.oldUrl)) {
      out = out.split(entry.oldUrl).join(entry.newUrl);
      count += 1;
    }
  }
  return { text: out, count };
}

/**
 * Moves already-"local" rows to the current key scheme (e.g. after a prefix
 * change). Re-downloads the CURRENT url, uploads under the new key, verifies,
 * updates the row in place (legacy* ImageKit values untouched), deletes the
 * old FTP file, and rewrites the row's url-map entry so the HTML pass lands
 * on the final URL.
 */
async function runRekey(args: Args, baseUrl: string, mapPath: string): Promise<void> {
  const prefix = storagePrefixSegments().join("/");
  const needed = prefix ? `${prefix}/` : null;
  const filter = args.only ? { _id: args.only } : { storageProvider: "local" };
  const rows = await MediaModel.find(filter).sort({ createdAt: 1 }).exec();
  const candidates = needed ? rows.filter((row) => !row.storageKey.startsWith(needed)) : [];
  console.log(`REKEY_CANDIDATES:${candidates.length}`);
  const limited = args.limit > 0 ? candidates.slice(0, args.limit) : candidates;
  const map = await loadMap(mapPath);
  const byMediaId = new Map(map.map((entry) => [entry.mediaId, entry]));
  let done = 0;
  for (const row of limited) {
    try {
      const { data } = await downloadBinary(row.url);
      const key = buildMediaKey(row.fileName, row.mime);
      const newUrl = publicAssetUrl(baseUrl, key);
      if (args.apply) {
        await uploadBufferToGoDaddy(key, data);
        try {
          await verifyPublicUrl(newUrl, data.length);
        } catch (error) {
          await removeFileFromGoDaddy(key).catch(() => undefined);
          throw error;
        }
        await MediaModel.findByIdAndUpdate(row._id, {
          $set: { url: newUrl, storageKey: key },
        }).exec();
        await removeFileFromGoDaddy(row.storageKey).catch(() => undefined);
        const entry = byMediaId.get(row._id.toString());
        if (entry) {
          entry.newUrl = newUrl;
        } else {
          byMediaId.set(row._id.toString(), {
            mediaId: row._id.toString(),
            oldUrl: row.url,
            newUrl,
          });
        }
      }
      done += 1;
      console.log(`${args.apply ? "REKEYED" : "REKEY_DRYRUN"}:${done} ${row.fileName} -> ${newUrl}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Media rekey skipped", { id: row._id.toString(), message });
      console.log(`SKIPPED:${row._id.toString()} ${message}`);
    }
  }
  if (args.apply && done > 0) {
    await writeFile(mapPath, `${JSON.stringify([...byMediaId.values()], null, 2)}\n`, "utf8");
    console.log(`MAP_WRITTEN:${mapPath}`);
  }
  console.log(`REKEY_DONE:${done}/${limited.length}`);
}

async function runHtml(args: Args): Promise<void> {
  const map = await loadMap(args.mapPath);
  if (map.length === 0) {
    console.log("HTML_SKIP:empty url map (run --kind media first)");
    return;
  }
  let docsChanged = 0;

  const rewriteStringArray = (
    label: string,
    id: string,
    values: Array<string | null | undefined>,
    save: (next: string[]) => Promise<void>,
  ) => ({ label, id, values, save });

  type StringFieldJob = {
    label: string;
    id: string;
    current: string | null | undefined;
    save: (next: string) => Promise<void>;
  };
  const stringJobs: StringFieldJob[] = [];
  const arrayJobs: Array<{
    label: string;
    id: string;
    values: Array<string | null | undefined>;
    save: (next: string[]) => Promise<void>;
  }> = [];

  const blogs = await BlogPostModel.find({}).select("_id content").exec();
  for (const doc of blogs) {
    stringJobs.push({
      label: "blog",
      id: doc._id.toString(),
      current: doc.content,
      save: async (next: string) => {
        await BlogPostModel.findByIdAndUpdate(doc._id, { $set: { content: next } }).exec();
      },
    });
  }
  const faqs = await FaqModel.find({}).select("_id answer").exec();
  for (const doc of faqs) {
    stringJobs.push({
      label: "faq",
      id: doc._id.toString(),
      current: doc.answer,
      save: async (next: string) => {
        await FaqModel.findByIdAndUpdate(doc._id, { $set: { answer: next } }).exec();
      },
    });
  }
  const offers = await OfferModel.find({}).select("_id description").exec();
  for (const doc of offers) {
    stringJobs.push({
      label: "offer",
      id: doc._id.toString(),
      current: doc.description,
      save: async (next: string) => {
        await OfferModel.findByIdAndUpdate(doc._id, { $set: { description: next } }).exec();
      },
    });
  }
  const policies = await PolicyDocModel.find({}).select("_id body").exec();
  for (const doc of policies) {
    stringJobs.push({
      label: "policy",
      id: doc._id.toString(),
      current: doc.body,
      save: async (next: string) => {
        await PolicyDocModel.findByIdAndUpdate(doc._id, { $set: { body: next } }).exec();
      },
    });
  }
  const roomTypes = await RoomTypeModel.find({})
    .select("_id propertyDetailsHtml layoutHtml surroundingsHtml welcomeHamperHtml")
    .exec();
  for (const doc of roomTypes) {
    for (const field of [
      "propertyDetailsHtml",
      "layoutHtml",
      "surroundingsHtml",
      "welcomeHamperHtml",
    ] as const) {
      const current = doc[field] as string | null | undefined;
      stringJobs.push({
        label: `roomType.${field}`,
        id: doc._id.toString(),
        current,
        save: async (next: string) => {
          await RoomTypeModel.findByIdAndUpdate(doc._id, { $set: { [field]: next } }).exec();
        },
      });
    }
  }
  const settingsDocs = await SiteSettingsModel.find({}).select("_id whyBookWithUs").exec();
  for (const doc of settingsDocs) {
    const items = (doc.whyBookWithUs ?? []) as Array<{ title: string; text?: string | null }>;
    arrayJobs.push(
      rewriteStringArray(
        "settings.whyBookWithUs",
        doc._id.toString(),
        items.map((item) => item.text),
        async (next: string[]) => {
          const merged = items.map((item, index) => ({ title: item.title, text: next[index] ?? null }));
          await SiteSettingsModel.findByIdAndUpdate(doc._id, { $set: { whyBookWithUs: merged } }).exec();
        },
      ),
    );
  }
  const pages = await PageModel.find({}).select("_id sections").exec();
  for (const doc of pages) {
    const sections = (doc.sections ?? []) as Array<{ html?: string | null }>;
    arrayJobs.push(
      rewriteStringArray(
        "page.sections.html",
        doc._id.toString(),
        sections.map((section) => section.html),
        async (next: string[]) => {
          const merged = sections.map((section, index) => ({ ...section, html: next[index] ?? null }));
          await PageModel.findByIdAndUpdate(doc._id, { $set: { sections: merged } }).exec();
        },
      ),
    );
  }

  const limitedStringJobs = args.limit > 0 ? stringJobs.slice(0, args.limit) : stringJobs;
  for (const job of limitedStringJobs) {
    if (!job.current) continue;
    const { text, count } = replaceAllOccurrences(job.current, map);
    if (count === 0) continue;
    if (args.apply) await job.save(text);
    docsChanged += 1;
    console.log(`${args.apply ? "HTML_REWRITTEN" : "HTML_DRYRUN"}:${job.label} ${job.id} urls:${count}`);
  }
  const limitedArrayJobs = args.limit > 0 ? arrayJobs.slice(0, args.limit) : arrayJobs;
  for (const job of limitedArrayJobs) {
    let changed = 0;
    const next = job.values.map((value) => {
      if (!value) return value;
      const { text, count } = replaceAllOccurrences(value, map);
      changed += count;
      return text;
    });
    if (changed === 0) continue;
    if (args.apply) await job.save(next as string[]);
    docsChanged += 1;
    console.log(`${args.apply ? "HTML_REWRITTEN" : "HTML_DRYRUN"}:${job.label} ${job.id} urls:${changed}`);
  }
  console.log(`HTML_DONE:docs:${docsChanged}`);
}

/**
 * Connection with fallback (same approach as scripts/backup-db.ts).
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await connectDatabase();
  try {
    if (args.kind === "all") {
      const [mediaTotal, mediaLocal, usersTotal, usersLocal] = await Promise.all([
        MediaModel.countDocuments({}).exec(),
        MediaModel.countDocuments({ storageProvider: "local" }).exec(),
        UserModel.countDocuments({ avatarFileId: { $ne: null } }).exec(),
        UserModel.countDocuments({ avatarStorageProvider: "local" }).exec(),
      ]);
      console.log(`INVENTORY:media total:${mediaTotal} local:${mediaLocal} remaining:${mediaTotal - mediaLocal}`);
      console.log(`INVENTORY:avatars total:${usersTotal} local:${usersLocal} remaining:${usersTotal - usersLocal}`);
      console.log(`MODE:${args.apply ? "APPLY" : "DRYRUN"} (pass --apply to mutate)`);
      return;
    }
    const baseUrl = requireFtpConfig();
    if (!args.apply) {
      console.log("MODE:DRYRUN (no uploads, no writes — pass --apply to mutate)");
    } else {
      // Live runs must prove the base URL serves the jail first.
      await preflightCheck(baseUrl);
    }
    if (args.kind === "media") {
      const mapped = await runMedia(args, baseUrl);
      if (mapped.length > 0) {
        await saveMap(args.mapPath, mapped);
        console.log(`MAP_WRITTEN:${args.mapPath} entries:${mapped.length}`);
      }
    } else if (args.kind === "rekey") {
      await runRekey(args, baseUrl, args.mapPath);
    } else if (args.kind === "avatars") {
      await runAvatars(args, baseUrl);
    } else {
      await runHtml(args);
    }
    console.log("BACKFILL_DONE");
  } finally {
    await disconnectDatabase();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("BACKFILL_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });

// One-command deploy pack for GoDaddy Node.js Hosting.
// Usage: npm run deploy:zip   (builds first, then packs)
// Output: ../server-godaddy-deploy.zip  (repo root, next to client/ and admin/)
// Layout inside zip: package.json at root, plus src, scripts, dist.
// Never included: node_modules, .env, logs, tests, old zips.
// Plain Node + archiver (devDependency), works on any OS.
const fs = require("node:fs");
const path = require("node:path");

const SERVER_DIR = path.join(__dirname, "..");
const OUT_ZIP = path.join(SERVER_DIR, "server-godaddy-deploy.zip");

// Top-level entries only: keeps node_modules, .env and logs out by design.
const FILES = [
  "package.json",
  "tsconfig.json",
  "tsconfig.build.json",
  ".env.example",
  ".env.production.example",
];
const DIRS = ["src", "scripts", "dist"];

function fail(message) {
  console.error(`[deploy:zip] ERROR: ${message}`);
  process.exit(1);
}

async function main() {
  // archiver v8 is ESM-only with no factory function, so dynamic
  // import + `new ZipArchive()` from this .cjs script.
  const { ZipArchive } = await import("archiver");

  for (const entry of [...FILES, ...DIRS]) {
    if (!fs.existsSync(path.join(SERVER_DIR, entry))) {
      fail(`missing required entry: ${entry} (run from the server folder)`);
    }
  }
  if (!fs.existsSync(path.join(SERVER_DIR, "dist", "server.js"))) {
    fail("dist/server.js not found. Run `npm run build` first.");
  }
  // Guarantee latest code: dist must be newer than every src file.
  // deploy:zip always builds first, this also protects direct runs.
  const distMtime = fs.statSync(path.join(SERVER_DIR, "dist", "server.js")).mtimeMs;
  const stack = [path.join(SERVER_DIR, "src")];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && fs.statSync(full).mtimeMs > distMtime) {
        fail(`stale dist: ${entry.name} changed after last build. Run fresh, don't pack by hand.`);
      }
    }
  }

  if (fs.existsSync(OUT_ZIP)) fs.rmSync(OUT_ZIP);

  const output = fs.createWriteStream(OUT_ZIP);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  output.on("close", () => {
    const mb = archive.pointer() / 1024 / 1024;
    console.log(`[deploy:zip] packed: ${OUT_ZIP} (${mb.toFixed(2)} MB)`);
    if (mb > 90) {
      console.warn("[deploy:zip] WARNING: over 90 MB, GoDaddy zip limit is 100 MB.");
    }
    console.log(
      "[deploy:zip] Upload it via: host.godaddy.com > Node.js Hosting > server > Update Preview",
    );
  });

  archive.on("warning", (err) => {
    if (err.code === "ENOENT") console.warn(`[deploy:zip] skipped: ${err.message}`);
    else fail(err.message);
  });
  archive.on("error", (err) => fail(err.message));

  archive.pipe(output);
  for (const file of FILES) archive.file(path.join(SERVER_DIR, file), { name: file });
  for (const dir of DIRS) archive.directory(path.join(SERVER_DIR, dir), dir);
  await archive.finalize();
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));

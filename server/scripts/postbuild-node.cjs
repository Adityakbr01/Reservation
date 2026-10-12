/**
 * Post-build fixup for plain-Node production output (GoDaddy Node.js 22).
 *
 * Why this exists:
 * - Dev uses Bun + TypeScript with extensionless relative imports
 *   (e.g. `from "./app"`), allowed by `moduleResolution: "Bundler"`.
 * - `tsc -p tsconfig.build.json` emits ESM JS as-is (still extensionless).
 * - Node ESM — unlike Bun — REQUIRES explicit `.js` extensions and does not
 *   resolve directory imports, so the raw output crashes with
 *   ERR_MODULE_NOT_FOUND on Node.
 *
 * What it does (source files are NOT touched):
 * - Walks dist and fixes every emitted JS file
 * - Rewrites relative `from "…"`, `import("…")`, `export … from "…"`,
 *   `import "…"` specifiers:
 *     "./app"            -> "./app.js" (when app.js exists)
 *     "./emails"         -> "./emails/index.js" (when directory + index.js)
 * - Leaves package imports ("express", "mongoose") and already-suffixed
 *   ("./x.js", ".json", ".node") imports alone.
 *
 * Run: `node scripts/postbuild-node.cjs` (called automatically by `npm run build`).
 * Works with both `npm` and `bun` — plain Node only, no dependencies.
 */
const fs = require("node:fs");
const path = require("node:path");

const OUT_DIR = process.env.BUILD_OUT_DIR
  ? path.resolve(process.env.BUILD_OUT_DIR)
  : path.join(__dirname, "..", "dist");

const HAS_EXT = /\.(js|mjs|cjs|json|node)$/;

/** Resolve a relative specifier to its Node-ESM form, or null to leave as-is. */
function resolveSpecifier(spec, importerFile) {
  if (!spec.startsWith("./") && !spec.startsWith("../")) return null;
  if (HAS_EXT.test(spec.split("?")[0].split("#")[0])) return null;

  const clean = spec.split("?")[0].split("#")[0];
  const base = path.resolve(path.dirname(importerFile), clean);

  try {
    if (fs.statSync(base + ".js").isFile()) return `${clean}.js`;
  } catch {
    // not a file with .js — try directory index below
  }
  try {
    if (fs.statSync(path.join(base, "index.js")).isFile()) return `${clean}/index.js`;
  } catch {
    // neither — fall through to safe default
  }
  // Safe default: file import that tsc just emitted (covers edge cases).
  return `${clean}.js`;
}

function fixFile(file) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  // Matches: from "…", import "…", export … from "…", import("…"), import ("…")
  const pattern =
    /((?:from\s+|import\s*\(\s*|export\s+[^"']*?\s+from\s+|import\s+)(["']))(\.[^"']*)(\2)/g;

  text = text.replace(pattern, (match, prefix, quote, spec) => {
    const fixed = resolveSpecifier(spec, file);
    if (!fixed) return match;
    return `${prefix}${fixed}${quote}`;
  });

  if (text !== original) fs.writeFileSync(file, text);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && full.endsWith(".js")) fixFile(full);
  }
}

if (!fs.existsSync(OUT_DIR)) {
  console.error(`[postbuild-node] output dir missing: ${OUT_DIR} (did tsc fail?)`);
  process.exit(1);
}

walk(OUT_DIR);
console.log("[postbuild-node] ESM import specifiers fixed for Node.");

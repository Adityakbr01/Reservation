// Post-build for `npm run build:node` (plain-Node production build).
// Node ESM requires explicit file extensions in relative imports
// ("./app" fails, "./app.js" works), while Bun/bundlers accept both.
// This rewrites only the EMITTED files in dist-node/ — sources stay clean.
//  - "./x"      -> "./x.js"        when x.js exists
//  - "./dir"     -> "./dir/index.js" when dir/index.js exists (barrel folders)
// Anything unresolvable fails the build loudly instead of at 2am in prod.
const fs = require("node:fs");
const path = require("node:path");

const outDir = path.join(__dirname, "..", "dist-node");
if (!fs.existsSync(outDir)) {
  console.error(`[postbuild-node] output directory not found: ${outDir}`);
  process.exit(1);
}

const jsFiles = [];
(function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.name.endsWith(".js")) jsFiles.push(full);
  }
})(outDir);

// Matches: from "./x", from '../x', import("./x"), export ... from "./x"
const SPEC_RE = /((?:from|import\()\s*['"])(\.[^'"]+)(['"])/g;
const unresolved = [];

for (const file of jsFiles) {
  const src = fs.readFileSync(file, "utf8");
  let changed = false;
  const out = src.replace(SPEC_RE, (match, head, spec, tail) => {
    // Only real module extensions count as "already has extension".
    // Dotted basenames like auth.routes / seo.routes still need ".js".
    if (/\.(js|mjs|cjs|json|node)$/.test(spec)) return match;
    const base = path.resolve(path.dirname(file), spec);
    if (fs.existsSync(base + ".js")) {
      changed = true;
      return head + spec + ".js" + tail;
    }
    if (fs.existsSync(path.join(base, "index.js"))) {
      changed = true;
      return head + spec + "/index.js" + tail;
    }
    unresolved.push(`${path.relative(outDir, file)} -> ${spec}`);
    return match;
  });
  if (changed) fs.writeFileSync(file, out);
}

if (unresolved.length > 0) {
  console.error("[postbuild-node] unresolvable relative imports:");
  for (const u of unresolved) console.error(`  ${u}`);
  process.exit(1);
}

const entry = path.join(outDir, "server.js");
if (!fs.existsSync(entry)) {
  console.error("[postbuild-node] entry not found: dist-node/server.js");
  process.exit(1);
}
console.log(`[postbuild-node] rewrote extensions in ${jsFiles.length} files — ready for plain node.`);

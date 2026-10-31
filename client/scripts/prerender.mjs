import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "../dist-ssr/entry-server.js";

const dist = join(process.cwd(), "dist");
const indexPath = join(dist, "index.html");
const template = readFileSync(indexPath, "utf8");

const { html, search } = render("/");
const data = JSON.stringify(search).replace(/</g, "\u003c");

const output = template
  .replace(
    "</head>",
    `  <script>window.__HS_SSG_SEARCH__=${data};</script>\n  </head>`,
  )
  .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

writeFileSync(indexPath, output);

if (!output.includes('id="root"><')) {
  throw new Error("Prerender failed: home markup was not injected.");
}

console.log(`Prerendered / (${html.length.toLocaleString()} chars of markup)`);

process.exit(0);

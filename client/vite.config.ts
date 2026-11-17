import path from "node:path";
import { gzipSync } from "node:zlib";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Minimal gzip pre-compression (replaces vite-plugin-compression).
// Emits a .gz sibling for every JS/CSS/HTML/SVG/JSON asset over 1KB
// so Apache (.htaccess) can serve it directly.
function gzipPlugin(): Plugin {
  return {
    name: "gzip-precompress",
    async writeBundle(options, bundle) {
      const { writeFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const outDir = options.dir ?? "dist";
      for (const fileName of Object.keys(bundle)) {
        if (!/\.(js|mjs|cjs|css|html|svg|json)$/.test(fileName)) continue;
        const filePath = join(outDir, fileName);
        try {
          const { readFileSync } = await import("node:fs");
          const data = readFileSync(filePath);
          if (data.length < 1024) continue;
          writeFileSync(`${filePath}.gz`, gzipSync(data, { level: 9 }));
        } catch {
          // best-effort only — never fail the build on compression
        }
      }
    },
  };
}

// Warm the lazy home-route chunks in parallel with the entry instead of
// waiting for the router to render and discover the dynamic imports.
// This removes a serial network round-trip on the landing page.
function preloadHomeChunks(): Plugin {
  return {
    name: "preload-home-chunks",
    apply: "build",
    writeBundle: {
      sequential: true,
      order: "post",
      async handler(options) {
        const { readFileSync, writeFileSync, existsSync } =
          await import("node:fs");
        const { join } = await import("node:path");
        const outDir = options.dir ?? "dist";
        const manifestPath = join(outDir, ".vite", "manifest.json");
        const htmlPath = join(outDir, "index.html");
        if (!existsSync(htmlPath)) return;

        const shell = readFileSync(htmlPath, "utf8");
        // Non-home deep links hydrate an empty shell (client-rendered), so
        // they must not receive the preloads or the static home markup.
        writeFileSync(join(outDir, "app.html"), shell);
        if (!existsSync(manifestPath)) return;

        const manifest = JSON.parse(
          readFileSync(manifestPath, "utf8"),
        ) as Record<
          string,
          {
            file: string;
            isEntry?: boolean;
            imports?: string[];
            dynamicImports?: string[];
            css?: string[];
          }
        >;
        const byFile = new Map(
          Object.values(manifest).map((entry) => [entry.file, entry]),
        );
        const homeKey = Object.keys(manifest).find((key) =>
          key.endsWith("HomePage.tsx"),
        );
        if (!homeKey) return;

        const files = new Set<string>();
        const visit = (key: string) => {
          const entry = manifest[key] ?? byFile.get(key);
          if (!entry || entry.isEntry || files.has(entry.file)) return;
          files.add(entry.file);
          for (const dependency of entry.imports ?? []) visit(dependency);
          for (const css of entry.css ?? []) files.add(css);
        };
        visit(homeKey);

        const html = readFileSync(htmlPath, "utf8");
        const links = [...files]
          .filter((file) => !html.includes(`href="/${file}"`))
          .map(
            (file) =>
              `  <link rel="modulepreload" crossorigin href="/${file}">`,
          )
          .join("\n");
        if (!links) return;

        writeFileSync(htmlPath, html.replace("</head>", `${links}\n  </head>`));
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    preloadHomeChunks(),
    gzipPlugin(),
  ],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    manifest: true,
    chunkSizeWarningLimit: 1000,
  },
});

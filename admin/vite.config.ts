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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    gzipPlugin(),
  ],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/,
            },
            {
              name: "query-vendor",
              test: /node_modules[\\/]((@tanstack)[\\/]react-query|axios|zustand)[\\/]/,
            },
            {
              name: "ui-vendor",
              test: /node_modules[\\/]((lucide-react|class-variance-authority|clsx|tailwind-merge|react-hot-toast)|(@radix-ui)[\\/][^\\/]+)[\\/]/,
            },
          ],
        },
      },
    },
  },
});

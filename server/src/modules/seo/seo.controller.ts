import type { Request, Response } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../utils/async-handler";
import { ensureProperty } from "../properties/property.service";
import { listRoomTypes } from "../roomTypes/room-type.repository";
import { BlogPostModel, OfferModel, PageModel } from "../cms/cms.model";

/**
 * SEO surfaces owned by the backend (docs 08 §48-54, §84): sitemap from
 * published content only, robots blocking ops/account/checkout paths.
 */
export const sitemapHandler = asyncHandler(async (_req: Request, res: Response) => {
  const base = env.CLIENT_URL.replace(/\/$/, "");
  const property = await ensureProperty().catch(() => null);
  const urls = new Set<string>([`${base}/`, `${base}/blogs`, `${base}/offers`]);
  const [pages, posts, offers] = await Promise.all([
    PageModel.find({ status: "PUBLISHED" }).select("slug updatedAt").exec(),
    BlogPostModel.find({ status: "PUBLISHED" }).select("slug updatedAt").exec(),
    OfferModel.find({ status: "PUBLISHED" }).select("slug updatedAt").exec(),
  ]);
  for (const doc of pages) urls.add(`${base}/p/${doc.slug}`);
  for (const doc of posts) urls.add(`${base}/blogs/${doc.slug}`);
  for (const doc of offers) urls.add(`${base}/offers/${doc.slug}`);
  if (property) {
    const rooms = await listRoomTypes({ page: 1, limit: 100, onlyActive: true }).catch(() => null);
    for (const room of rooms?.data ?? []) urls.add(`${base}/rooms/${room.slug}`);
  }
  const entries = [...urls]
    .map((loc) => `  <url><loc>${loc}</loc></url>`)
    .join("\n");
  res
    .status(200)
    .type("application/xml")
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`);
});

export const robotsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const base = env.CLIENT_URL.replace(/\/$/, "");
  res
    .status(200)
    .type("text/plain")
    .send(
      ["User-agent: *", "Disallow: /admin", "Disallow: /api", "Disallow: /booking", "Disallow: /payments", `Sitemap: ${base}/sitemap.xml`, ""].join("\n"),
    );
});

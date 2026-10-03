import { Router } from "express";
import { robotsHandler, sitemapHandler } from "./seo.controller";

export const seoRouter = Router();

seoRouter.get("/sitemap.xml", sitemapHandler);
seoRouter.get("/robots.txt", robotsHandler);

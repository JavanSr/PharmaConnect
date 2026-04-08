import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/data/articles";
import { MODULES } from "@/lib/data/modules";

const staticRoutes = [
  "",
  "/platform",
  "/pricing",
  "/roadmap",
  "/about",
  "/blog",
  "/partners",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pharmaconnect.tz";
  const now = new Date();

  return [
    ...staticRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
    })),
    ...MODULES.map((module) => ({
      url: `${siteUrl}/platform/${module.slug}`,
      lastModified: now,
    })),
    ...ARTICLES.map((article) => ({
      url: `${siteUrl}/blog/${article.slug}`,
      lastModified: now,
    })),
  ];
}

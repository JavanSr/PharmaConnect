import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/data/articles";
import { MODULES } from "@/lib/data/modules";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pharmaconnect.tz";
  const staticRoutes = ["", "/platform", "/pricing", "/roadmap", "/about", "/blog", "/partners", "/contact"];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: route === "" ? 1 : 0.8,
    })),
    ...MODULES.map((module) => ({
      url: `${base}/platform/${module.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...ARTICLES.map((article) => ({
      url: `${base}/blog/${article.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}

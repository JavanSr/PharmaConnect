import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pharmaconnect.tz";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/investors", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

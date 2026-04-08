module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://pharmaconnect.tz",
  generateRobotsTxt: true,
  exclude: ["/investors", "/api/*"],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/", disallow: ["/investors", "/api/"] },
    ],
  },
};

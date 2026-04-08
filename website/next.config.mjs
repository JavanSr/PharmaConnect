import { copyFile, mkdir, readdir, writeFile } from "fs/promises";
import path from "path";

const appPaths = {
  "/_not-found/page": "app/_not-found/page.js",
  "/page": "app/page.js",
  "/about/page": "app/about/page.js",
  "/blog/page": "app/blog/page.js",
  "/blog/[slug]/page": "app/blog/[slug]/page.js",
  "/contact/page": "app/contact/page.js",
  "/investors/page": "app/investors/page.js",
  "/partners/page": "app/partners/page.js",
  "/platform/page": "app/platform/page.js",
  "/platform/[module]/page": "app/platform/[module]/page.js",
  "/pricing/page": "app/pricing/page.js",
  "/roadmap/page": "app/roadmap/page.js",
  "/api/contact/route": "app/api/contact/route.js",
  "/api/investor-access/route": "app/api/investor-access/route.js",
  "/api/investor-verify/route": "app/api/investor-verify/route.js",
  "/api/notify/route": "app/api/notify/route.js",
  "/api/og/route": "app/api/og/route.js",
  "/api/waitlist/route": "app/api/waitlist/route.js",
  "/opengraph-image/route": "app/opengraph-image/route.js",
  "/favicon.ico/route": "app/favicon.ico/route.js",
  "/robots.txt/route": "app/robots.txt/route.js",
  "/sitemap.xml/route": "app/sitemap.xml/route.js",
};

const appPathRoutes = {
  "/_not-found/page": "/_not-found",
  "/page": "/",
  "/about/page": "/about",
  "/blog/page": "/blog",
  "/blog/[slug]/page": "/blog/[slug]",
  "/contact/page": "/contact",
  "/investors/page": "/investors",
  "/partners/page": "/partners",
  "/platform/page": "/platform",
  "/platform/[module]/page": "/platform/[module]",
  "/pricing/page": "/pricing",
  "/roadmap/page": "/roadmap",
  "/api/contact/route": "/api/contact",
  "/api/investor-access/route": "/api/investor-access",
  "/api/investor-verify/route": "/api/investor-verify",
  "/api/notify/route": "/api/notify",
  "/api/og/route": "/api/og",
  "/api/waitlist/route": "/api/waitlist",
  "/opengraph-image/route": "/opengraph-image",
  "/favicon.ico/route": "/favicon.ico",
  "/robots.txt/route": "/robots.txt",
  "/sitemap.xml/route": "/sitemap.xml",
};

const pagesManifest = {
  "/_app": "pages/_app.js",
  "/_document": "pages/_document.js",
  "/_error": "pages/_error.js",
  "/404": "pages/404.js",
  "/500": "pages/500.js",
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: "build-output",
  cleanDistDir: false,
  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tapPromise(
            "PharmaConnectAppPathManifestPlugin",
            async () => {
              const outDir = path.join(process.cwd(), "build-output");
              const serverDir = path.join(outDir, "server");
              await mkdir(path.join(outDir, "server"), { recursive: true });
              const chunkDir = path.join(serverDir, "chunks");
              const chunks = await readdir(chunkDir).catch(() => []);
              await Promise.all(
                chunks
                  .filter((chunk) => chunk.endsWith(".js"))
                  .map((chunk) =>
                    copyFile(path.join(chunkDir, chunk), path.join(serverDir, chunk)),
                  ),
              );
              await writeFile(
                path.join(serverDir, "app-paths-manifest.json"),
                JSON.stringify(appPaths, null, 2),
              );
              await writeFile(
                path.join(outDir, "app-path-routes-manifest.json"),
                JSON.stringify(appPathRoutes, null, 2),
              );
              await writeFile(
                path.join(serverDir, "pages-manifest.json"),
                JSON.stringify(pagesManifest, null, 2),
              );
            },
          );
        },
      });
    }

    return config;
  },
};

export default nextConfig;

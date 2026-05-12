/** @type {import('next').NextConfig} */
const config = {
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {},
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/landing.html" },
      ],
    };
  },
};

export default config;

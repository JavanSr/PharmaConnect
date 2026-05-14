import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { dmSans, dmSerif, jetbrainsMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://apotekh.co.tz"),
  title: {
    default: "APOTEKH · The operating system for pharmacies",
    template: "%s · APOTEKH",
  },
  description:
    "Tanzania's pharmacies need more than a point-of-sale system. APOTEKH gives them inventory control, patient safety checks, regulatory compliance, and analytics — in one platform.",
  keywords:
    "Tanzania pharmacy software, pharmaceutical management, inventory, dispensing, patient safety, APOTEKH, TMDA",
  openGraph: {
    type: "website",
    locale: "en_TZ",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://apotekh.co.tz",
    siteName: "APOTEKH",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "APOTEKH" }],
  },
  twitter: { card: "summary_large_image", site: "@APOTEKH" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="icon" type="image/svg+xml" href="/assets/logo/apotekh-icon.svg" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import { dmSans, dmSerif, jetbrainsMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://apotekh.co.tz"),
  title: {
    default: "APOTEKH - Better Pharmaceutical Services for Tanzania",
    template: "%s - APOTEKH",
  },
  description:
    "The pharmacy-side platform for Tanzania's 14,000+ pharmacies and ADDOs. Inventory, dispensing, patient safety, and compliance — live in Dodoma.",
  keywords:
    "Tanzania pharmacy software, pharmaceutical management, inventory, dispensing, patient safety, Dodoma, APOTEKH",
  openGraph: {
    type: "website",
    locale: "en_TZ",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://apotekh.co.tz",
    siteName: "APOTEKH",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "APOTEKH" }],
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

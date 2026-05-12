import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import { dmSans, dmSerif, jetbrainsMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pharmaconnect.tz"),
  title: {
    default: "PharmaConnect - Better Pharmaceutical Services for Tanzania",
    template: "%s - PharmaConnect",
  },
  description:
    "The pharmacy-side platform for Tanzania's 14,000+ pharmacies and ADDOs. NHIF claims, patient safety, compliance, and CPD - live in Arusha.",
  keywords:
    "Tanzania pharmacy software, NHIF claims, UHI, pharmaceutical management, Arusha",
  openGraph: {
    type: "website",
    locale: "en_TZ",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pharmaconnect.tz",
    siteName: "PharmaConnect",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PharmaConnect" }],
  },
  twitter: { card: "summary_large_image", site: "@PharmaConnect" },
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

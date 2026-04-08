import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pharmaconnect.tz"),
  title: "PharmaConnect - Better Pharmaceutical Services for Tanzania",
  description:
    "The pharmacy-side operating system for Tanzania's pharmacies and ADDOs: NHIF claims, patient safety, inventory, CPD, and compliance in one focused platform.",
  keywords:
    "Tanzania pharmacy software, NHIF claims, UHI compliance, pharmaceutical management, Arusha, East Africa",
  openGraph: {
    type: "website",
    locale: "en_TZ",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pharmaconnect.tz",
    siteName: "PharmaConnect",
    title: "PharmaConnect - Better Pharmaceutical Services for Tanzania",
    description:
      "A pharmacy-side operating system for Tanzania and East Africa.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}

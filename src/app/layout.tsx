import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaConnect",
  description:
    "Production-minded MVP for pharmacy inventory, knowledge sharing, and regulatory compliance in Tanzania.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

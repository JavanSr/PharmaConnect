"use client";

import Image from "next/image";

/**
 * Real, unretouched screenshots captured from the live APOTEKH build
 * (regenerate with scripts/refresh-user-manual-screenshots.mjs, then copy the
 * chosen PNGs to public/assets/screenshots). These are the proof the stylised
 * widgets can't provide — never replace them with mockups or stock imagery.
 */

const SCREENS = [
  {
    src: "/assets/screenshots/03-dashboard.png",
    alt: "APOTEKH Owner Dashboard showing today's revenue, low stock alerts and expiry warnings",
    caption: "Owner Dashboard — today's revenue, live",
  },
  {
    src: "/assets/screenshots/12-dispensing.png",
    alt: "APOTEKH dispensing screen with medicine search, basket and payment methods",
    caption: "Dispensing — safety-checked at the counter",
  },
  {
    src: "/assets/screenshots/18-analytics.png",
    alt: "APOTEKH analytics with multi-outlet comparison chart",
    caption: "Analytics — every outlet, one view",
  },
];

export default function RealScreens() {
  return (
    <section style={{ background: "#F7FBF8", padding: "72px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <p
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#1A6B5C",
            marginBottom: 12,
          }}
        >
          Real screens · Not mockups
        </p>
        <h2
          className="serif"
          style={{
            fontSize: "clamp(28px,3.5vw,44px)",
            color: "#0D4035",
            margin: "0 0 8px",
            lineHeight: 1.1,
          }}
        >
          This is the actual system
        </h2>
        <p style={{ fontSize: 15, color: "#516965", marginBottom: 40, maxWidth: 620 }}>
          Unretouched screenshots from APOTEKH as it runs today — the same screens
          your team would use tomorrow.
        </p>
        <div className="three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {SCREENS.map((screen) => (
            <figure key={screen.src} style={{ margin: 0 }}>
              <div
                style={{
                  border: "1px solid #E2EDE8",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(13,64,53,0.08)",
                  background: "white",
                }}
              >
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={1280}
                  height={800}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                />
              </div>
              <figcaption
                style={{ marginTop: 10, fontSize: 13, color: "#516965", textAlign: "center" }}
              >
                {screen.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

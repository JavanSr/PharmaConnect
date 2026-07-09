"use client";

import { useEffect, useState } from "react";

/**
 * Live platform proof strip. Fetches anonymous aggregate stats from the API's
 * public-stats endpoint. The backend applies credibility thresholds, so this
 * component renders NOTHING until the numbers are worth showing — the website
 * grows teeth automatically as the platform grows. Never hardcode numbers here;
 * real data or silence.
 */

interface PublicStat {
  key: string;
  label: string;
  value: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://pharmaconnect-production-e082.up.railway.app/api/v1";

export default function ProofStrip() {
  const [stats, setStats] = useState<PublicStat[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/public-stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled && Array.isArray(body?.data?.stats)) {
          setStats(body.data.stats);
        }
      })
      .catch(() => {
        /* silent — the strip simply doesn't render */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (stats.length === 0) return null;

  return (
    <section
      aria-label="APOTEKH live platform numbers"
      style={{ background: "#0D4035", padding: "28px 32px" }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "24px 64px",
        }}
      >
        {stats.map((stat) => (
          <div key={stat.key} style={{ textAlign: "center", minWidth: 160 }}>
            <p
              className="serif"
              style={{ fontSize: 34, lineHeight: 1.1, color: "white", margin: 0 }}
            >
              {stat.value.toLocaleString()}+
            </p>
            <p
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#7ECFB4",
                margin: "6px 0 0",
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

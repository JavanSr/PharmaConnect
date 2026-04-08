import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PharmaConnect";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0D4035",
          color: "white",
          display: "flex",
          height: "100%",
          padding: 96,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div style={{ fontSize: 84, fontWeight: 700 }}>PharmaConnect</div>
          <div style={{ color: "#D6F0E8", fontSize: 38 }}>
            The pharmacy-side operating system
          </div>
          <div style={{ color: "#AADDD0", fontSize: 32 }}>
            for better pharmaceutical services
          </div>
        </div>
      </div>
    ),
    size,
  );
}

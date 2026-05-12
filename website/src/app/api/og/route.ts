export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#0D4035"/>
    <image href="/assets/logo/apotekh-logo-white.svg" x="112" y="118" width="460" height="105" preserveAspectRatio="xMinYMid meet"/>
    <text x="124" y="360" fill="#D6F0E8" font-family="Arial, sans-serif" font-size="40">The pharmacy-side operating system for better pharmaceutical services</text>
    <text x="124" y="430" fill="#AADDD0" font-family="Arial, sans-serif" font-size="30">Inventory, dispensing, patient safety, and compliance</text>
    <text x="124" y="505" fill="#E8A020" font-family="Arial, sans-serif" font-size="26">Dodoma, Tanzania &#183; 2026</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

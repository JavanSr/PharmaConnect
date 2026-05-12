export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#0D4035"/>
    <rect x="120" y="120" width="16" height="104" rx="2" transform="scale(2)" fill="#FFFFFF"/>
    <text x="120" y="360" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="82" font-weight="700">APOTEKH</text>
    <text x="124" y="430" fill="#D6F0E8" font-family="Arial, sans-serif" font-size="34">The pharmacy-side operating system for better pharmaceutical services</text>
    <text x="124" y="500" fill="#AADDD0" font-family="Arial, sans-serif" font-size="26">Dodoma, Tanzania · 2026</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

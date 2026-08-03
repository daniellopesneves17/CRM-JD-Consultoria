const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="#111827"/>
  <path d="M10 29c0-10.5 8.5-19 19-19h6c10.5 0 19 8.5 19 19v6c0 10.5-8.5 19-19 19h-6c-10.5 0-19-8.5-19-19v-6Z" fill="url(#bg)"/>
  <path d="M22 20v16.5a5.5 5.5 0 0 0 11 0V20M37 20h3.5a9 9 0 0 1 0 18H37V20Z" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const dynamic = "force-static";

export function GET() {
  return new Response(favicon.trim(), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
    }
  });
}

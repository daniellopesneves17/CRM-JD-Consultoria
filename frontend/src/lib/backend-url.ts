import "server-only";

export function getBackendUrl() {
  const url = process.env.BACKEND_SERVICE_URL
    || process.env.BACKEND_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/backend` : "http://localhost:3001");
  return url.replace(/\/$/, "");
}

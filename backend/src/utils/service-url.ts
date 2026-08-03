const servicePrefix = "/api/backend";

export function rewriteServiceUrl(request: { url?: string }) {
  const url = request.url || "/";
  if (url === servicePrefix) return "/";
  if (url.startsWith(`${servicePrefix}/`)) return url.slice(servicePrefix.length);
  return url;
}

export function isSameOriginRefreshRequest(
  requestHeaders: Pick<Headers, "get">,
  method: string,
): boolean {
  if (method !== "GET" && method !== "POST") return false;

  const host = requestHeaders.get("host");
  const origin = requestHeaders.get("origin");
  const fetchSite = requestHeaders.get("sec-fetch-site");

  if (fetchSite === "cross-site") return false;

  if (origin) {
    if (!host) return false;

    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.host !== host) return false;
      if (process.env.NODE_ENV === "production") {
        return parsedOrigin.protocol === "https:";
      }
      return parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:";
    } catch {
      return false;
    }
  }

  return method === "GET" && (fetchSite === "same-origin" || fetchSite === "none");
}

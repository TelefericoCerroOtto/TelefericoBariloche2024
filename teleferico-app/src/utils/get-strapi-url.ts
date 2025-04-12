export function getStrapiURL(endpoint: string, qs?: string) {
  return `${process.env.STRAPI_BASE_URL ?? "http://localhost:1337"}${endpoint}${qs ? `?${qs}` : ""}`;
}

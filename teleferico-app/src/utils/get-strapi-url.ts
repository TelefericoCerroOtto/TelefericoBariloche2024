export function getStrapiURL(endpoint: string, qs?: string) {
  return `${process.env.BUILD_STRAPI_BASE_URL ?? "http://localhost:1337"}${endpoint}${qs ? `?${qs}` : ""}`;
}

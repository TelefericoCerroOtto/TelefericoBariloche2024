export function getStrapiURL() {
  return process.env.STRAPI_BASE_URL ?? "http://localhost:1337";
}

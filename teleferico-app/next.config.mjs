/** @type {import('next').NextConfig} */
const nextConfig = {
  // This rewrite rule proxies image requests through Next.js to hide the Strapi base URL.
  // This allows frontend components to load images without directly referencing the backend URL.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.STRAPI_BASE_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

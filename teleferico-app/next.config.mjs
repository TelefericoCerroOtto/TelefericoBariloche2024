/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    globalNotFound: true,
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    qualities: [68, 70, 72, 76, 78, 80, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.BUILD_STRAPI_BUCKET_HOSTNAME,
        pathname: process.env.BUILD_STRAPI_BUCKET_PATHNAME,
      },
    ],
  },
  // This rewrite rule proxies image requests through Next.js to hide the Strapi base URL.
  // This allows frontend components to load images without directly referencing the backend URL.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.BUILD_STRAPI_BASE_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

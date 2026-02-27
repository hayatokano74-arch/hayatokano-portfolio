/** @type {import('next').NextConfig} */
const wpMediaHost = process.env.WP_MEDIA_HOST;
const wpPattern =
  wpMediaHost && wpMediaHost.trim().length > 0
    ? [{ protocol: "https", hostname: wpMediaHost.trim(), pathname: "/**" }]
    : [];

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      ...wpPattern,
    ],
  },
};

export default nextConfig;

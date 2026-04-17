/** @type {import('next').NextConfig} */

// CMS メディアホスト（hayatokano.com/_cms/uploads/ から配信）
const cmsMediaHost = process.env.CMS_MEDIA_HOST ?? "hayatokano.com";

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // CMS メディア（Xserver: hayatokano.com/_cms/uploads/）
      { protocol: "https", hostname: cmsMediaHost, pathname: "/**" },
    ],
  },
};

export default nextConfig;

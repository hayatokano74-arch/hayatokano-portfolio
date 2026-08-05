/** @type {import('next').NextConfig} */

// CMS メディアホスト（media.hayatokano.com から配信）
const cmsMediaHost = process.env.CMS_MEDIA_HOST ?? "media.hayatokano.com";

const nextConfig = {
  /* /about/ のようにスラッシュ末尾でディレクトリ構造を生成 */
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // CMS メディア（Xserver: media.hayatokano.com）
      { protocol: "https", hostname: cmsMediaHost, pathname: "/**" },
    ],
    /* CMS が既に WebP へ変換済みのため Vercel Image Optimization は使わず直接配信する。
     * 原寸画像（7000px超）を AVIF/WebP × 複数解像度へ再変換すると Vercel の最適化枠を
     * 急速に消費し、未キャッシュ画像が 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) で
     * 表示されなくなる事象が発生したため無効化。 */
    unoptimized: true,
  },
};

export default nextConfig;

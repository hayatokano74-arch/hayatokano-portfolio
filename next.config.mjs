/** @type {import('next').NextConfig} */
const wpMediaHost = process.env.WP_MEDIA_HOST;
const wpPattern =
  wpMediaHost && wpMediaHost.trim().length > 0
    ? [{ protocol: "https", hostname: wpMediaHost.trim(), pathname: "/**" }]
    : [];

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...wpPattern,
    ],
    /* AVIF → WebP の優先順でサーバー側変換（AVIF は WebP より 30〜50% 小さい） */
    formats: ["image/avif", "image/webp"],
    /* 最適化済み画像のキャッシュ時間: 1時間（デフォルト 60秒）に延長 */
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;

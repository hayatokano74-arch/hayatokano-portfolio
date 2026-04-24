/** @type {import('next').NextConfig} */

// CMS メディアホスト（media.hayatokano.com から配信）
const cmsMediaHost = process.env.CMS_MEDIA_HOST ?? "media.hayatokano.com";

const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig = {
  /* 静的エクスポート（Xserver rsync デプロイ用）
     STATIC_EXPORT=true の時のみ有効。deploy.sh が設定する。
     通常の next dev / next build では undefined = 通常サーバービルド */
  ...(isStaticExport ? { output: "export" } : {}),
  /* /about/ のようにスラッシュ末尾でディレクトリ構造を生成（Apache で clean URL） */
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // CMS メディア（Xserver: hayatokano.com/_cms/uploads/）
      { protocol: "https", hostname: cmsMediaHost, pathname: "/**" },
    ],
    /* 静的エクスポートでは Next.js 画像最適化が使えないため unoptimized */
    ...(isStaticExport ? { unoptimized: true } : {}),
  },
};

export default nextConfig;

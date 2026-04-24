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
      // CMS メディア（Xserver: media.hayatokano.com）
      { protocol: "https", hostname: cmsMediaHost, pathname: "/**" },
    ],
    /* AVIF → WebP → JPEG の順で最適フォーマットを選択（AVIF は WebP 比 30〜50% 軽量） */
    formats: ["image/avif", "image/webp"],
    /* Vercel CDN でのキャッシュ期間: 30日（デフォルト 60秒を延長） */
    minimumCacheTTL: 2592000,
    /* よく使うブレークポイントに絞る（デフォルト16段階→7段階でキャッシュヒット率向上） */
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [32, 64, 128, 256, 420],
    /* 静的エクスポートでは Next.js 画像最適化が使えないため unoptimized */
    ...(isStaticExport ? { unoptimized: true } : {}),
  },
};

export default nextConfig;

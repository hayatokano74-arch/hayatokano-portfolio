/** @type {import('next').NextConfig} */

// CMS メディアホスト（hayatokano.com/_cms/uploads/ から配信）
const cmsMediaHost = process.env.CMS_MEDIA_HOST ?? "hayatokano.com";

const nextConfig = {
  /* 静的エクスポート（Xserver rsync デプロイ用）
     STATIC_EXPORT=true の時のみ有効（npm run build では undefined = 通常サーバービルド）
     deploy.sh が STATIC_EXPORT=true next build を呼ぶ */
  ...(process.env.STATIC_EXPORT === 'true' ? { output: "export" } : {}),
  /* /about/ のようにスラッシュ末尾にしてディレクトリ構造で生成（Apache で clean URL が使いやすい） */
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // CMS メディア（Xserver: hayatokano.com/_cms/uploads/）
      { protocol: "https", hostname: cmsMediaHost, pathname: "/**" },
    ],
    /* 静的エクスポートでは Next.js 画像最適化サーバーが使えないため unoptimized に設定。
       画像は外部URLまたはpublic/からそのまま配信される。 */
    unoptimized: true,
  },
};

export default nextConfig;

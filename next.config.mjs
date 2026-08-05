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
    /* Vercel Image Optimization（従量課金）は使わず、CMSがアップロード時に
     * 事前生成したレスポンシブ用WebP（w640_/w1080_/w1920_、長辺2560px上限）を
     * カスタムローダーで選択して直接配信する。詳細: src/lib/image-loader.ts */
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    /* カスタムローダーに渡される width 候補。CMS側の生成ブレークポイントと一致させる */
    deviceSizes: [640, 1080, 1920, 2560],
    imageSizes: [32, 64, 128, 256, 420],
  },
};

export default nextConfig;

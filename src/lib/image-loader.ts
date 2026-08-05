/**
 * next/image 用カスタムローダー
 *
 * Vercelの画像最適化（従量課金）を使わず、CMSが事前生成したレスポンシブ用
 * WebPバリアント（w640_ / w1080_ / w1920_、長辺2560pxの原寸WebPが上限）を
 * 画面幅に応じて選択して返す。
 *
 * 生成側: cms/lib/upload.php の RESPONSIVE_BREAKPOINTS と値を一致させること。
 */

const CMS_MEDIA_HOST = process.env.NEXT_PUBLIC_CMS_MEDIA_HOST ?? "media.hayatokano.com";

/** upload.php の RESPONSIVE_BREAKPOINTS と同じ値（昇順） */
const BREAKPOINTS = [640, 1080, 1920] as const;

type LoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function cmsImageLoader({ src, width }: LoaderProps): string {
  // CMS配信の画像以外（外部URL・YouTubeサムネイル等）はそのまま返す
  if (!src.includes(CMS_MEDIA_HOST)) return src;

  const lastSlash = src.lastIndexOf("/");
  if (lastSlash === -1) return src;
  const dir = src.slice(0, lastSlash + 1);
  const filename = src.slice(lastSlash + 1);

  // 既にサムネイル(thumb_)やブレークポイント(w{n}_)が付いている、
  // または .webp 以外（動画ポスター等の直リンク）はそのまま返す
  if (filename.startsWith("thumb_") || /^w\d+_/.test(filename) || !filename.endsWith(".webp")) {
    return src;
  }

  const bp = BREAKPOINTS.find((b) => width <= b);
  // 最大ブレークポイントを超える場合は原寸WebP（長辺2560px上限）をそのまま使う
  if (!bp) return src;

  return `${dir}w${bp}_${filename}`;
}

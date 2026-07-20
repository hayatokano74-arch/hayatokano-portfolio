/**
 * URL ユーティリティ — 共通化関数
 *
 * works.ts と me-no-hoshi/utils.ts に重複していた Unicode URL 処理を
 * このファイルに統合する。
 */

/* モジュールレベルに RegExp を巻き上げ（再コンパイル防止） */
const RE_UNICODE_TEST = /u[0-9a-fA-F]{4}/;
const RE_UNICODE_REPLACE = /u([0-9a-fA-F]{4})/g;

/**
 * 壊れたUnicodeエスケープ（uXXXX → 正しいUnicode文字）を復元する。
 * WordPress の sanitize_file_name() が CJK 文字を壊した場合のフォールバック。
 *
 * 対象コードポイント範囲:
 *  - 0x3000–0x9FFF: CJK統合漢字・ひらがな・カタカナ等
 *  - 0xF900–0xFAFF: CJK互換漢字
 *  - 0xFF00–0xFFEF: 全角英数・半角カタカナ等
 */
/**
 * CMS から返される相対パス（/media/...）を絶対 URL に変換する。
 * NEXT_PUBLIC_CMS_MEDIA_HOST 環境変数で配信元を切り替え可能。
 * 既に http(s):// で始まる URL はそのまま返す。
 *
 * PNG/JPG は CMS が自動生成した .webp を優先する。
 * Vercel Image Optimization のソースサイズ上限（15MB）を回避するため、
 * 90MB 級の PNG を直接フェッチさせず、1〜4MB の WebP を使わせる。
 */
export function absoluteMediaSrc(src: string): string {
  if (!src || src.startsWith("http")) return src;
  if (src.startsWith("/")) {
    const host =
      process.env.NEXT_PUBLIC_CMS_MEDIA_HOST ?? "media.hayatokano.com";
    /* CMS アップロード済み画像は .png.webp / .jpg.webp が自動生成されている */
    const webpPath = /\.(png|jpe?g|gif)$/i.test(src) ? src + ".webp" : src;
    return `https://${host}${webpPath}`;
  }
  return src;
}

/**
 * グリッドサムネイル専用: CMS が自動生成した thumb_ ファイルを使用する。
 *
 * CMS は全アップロード時に thumb_{filename}.{ext}.webp を生成する（約 20–60KB）。
 * フルサイズ WebP（1MB〜）の代わりにこれを使うことで Vercel の
 * ソースフェッチ量を約 1/30 に削減できる。
 *
 * 変換例:
 *   /media/works/w007/20260405102839_b246529d.jpg
 *   → https://media.hayatokano.com/media/works/w007/thumb_20260405102839_b246529d.jpg.webp
 *
 * /media/ 以外の URL（外部 URL 等）は absoluteMediaSrc にフォールバック。
 */
export function thumbMediaSrc(src: string): string {
  if (!src || src.startsWith("http")) return src;
  if (src.startsWith("/media/")) {
    const lastSlash = src.lastIndexOf("/");
    const dir = src.substring(0, lastSlash + 1);
    const filename = src.substring(lastSlash + 1);
    /* すでに thumb_ または .webp の場合はそのまま absoluteMediaSrc に渡す */
    if (filename.startsWith("thumb_") || filename.endsWith(".webp")) {
      return absoluteMediaSrc(src);
    }
    const thumbPath = `${dir}thumb_${filename}.webp`;
    return absoluteMediaSrc(thumbPath);
  }
  /* /media/ 以外はフルサイズ WebP にフォールバック */
  return absoluteMediaSrc(src);
}

/**
 * リッチテキスト本文(HTML)内に埋め込まれた <img src="..."> を絶対URL化する。
 *
 * CMSサーバーの設定不備により、TinyMCEで本文に直接挿入した画像のsrcが
 * 相対パス（/media/... や、TinyMCEの相対URL変換による ../../media/... 等）
 * のまま保存されていたことがある。本番サイト(別オリジン)ではこれが正しく
 * 解決できず画像が表示されないため、パスの先頭の ../ を除去してから
 * absoluteMediaSrc で絶対URL化する。
 */
export function absolutizeBodyImages(html: string): string {
  if (!html) return html;
  return html.replace(/src="((?:\.\.\/)*\/?media\/[^"]+)"/g, (_match, path: string) =>
    `src="${absoluteMediaSrc(normalizeMediaRelativePath(path))}"`,
  );
}

/**
 * 先頭の ../ の連続や欠けた / を取り除き、/media/... 形式のルート相対パスに正規化する。
 * 例: "../../media/misc/foo.png" → "/media/misc/foo.png"
 */
export function normalizeMediaRelativePath(path: string): string {
  return "/" + path.replace(/^(?:\.\.\/)*\/?/, "");
}

export function fixBrokenUnicodeUrl(url: string): string {
  if (!RE_UNICODE_TEST.test(url)) return url;
  const decoded = url.replace(RE_UNICODE_REPLACE, (_match, hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x3000 && cp <= 0x9fff) return String.fromCodePoint(cp);
    if (cp >= 0xf900 && cp <= 0xfaff) return String.fromCodePoint(cp);
    if (cp >= 0xff00 && cp <= 0xffef) return String.fromCodePoint(cp);
    return _match;
  });
  try {
    const u = new URL(decoded);
    u.pathname = u.pathname
      .split("/")
      .map((s) => encodeURIComponent(decodeURIComponent(s)))
      .join("/");
    return u.toString();
  } catch {
    return decoded;
  }
}

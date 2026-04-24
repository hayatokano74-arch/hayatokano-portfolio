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
 */
export function absoluteMediaSrc(src: string): string {
  if (!src || src.startsWith("http")) return src;
  if (src.startsWith("/")) {
    const host =
      process.env.NEXT_PUBLIC_CMS_MEDIA_HOST ?? "media.hayatokano.com";
    return `https://${host}${src}`;
  }
  return src;
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

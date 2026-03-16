/**
 * 目の星 — ユーティリティ純粋関数
 */

/* モジュールレベルに RegExp を巻き上げ（js-hoist-regexp） */
const RE_UNICODE_TEST = /u[0-9a-fA-F]{4}/;
const RE_UNICODE_REPLACE = /u([0-9a-fA-F]{4})/g;
const RE_HTML_TAG = /<[a-z][\s\S]*?>/i;

/**
 * 壊れたUnicodeエスケープ（uXXXX → 正しいUnicode文字）を復元
 * WP sanitize_file_name() がCJK文字を壊した場合のフォールバック
 */
export function fixBrokenUnicodeUrl(url: string): string {
  if (!RE_UNICODE_TEST.test(url)) return url;
  return url.replace(RE_UNICODE_REPLACE, (_match, hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x3000 && cp <= 0x9fff) return String.fromCodePoint(cp);
    if (cp >= 0xf900 && cp <= 0xfaff) return String.fromCodePoint(cp);
    if (cp >= 0xff00 && cp <= 0xffef) return String.fromCodePoint(cp);
    return _match;
  });
}

/** HTMLタグがなければ改行をbrに変換、HTMLがあればそのまま返す */
export function ensureHtml(text: string): string {
  if (!text) return "";
  if (RE_HTML_TAG.test(text)) return text;
  return text.replace(/\n/g, "<br />");
}

/** タグ文字列を正規化（空文字除去のみ） */
export function normalizeTag(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

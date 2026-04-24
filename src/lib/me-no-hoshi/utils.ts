/**
 * 目の星 — ユーティリティ純粋関数
 */

/* モジュールレベルに RegExp を巻き上げ（js-hoist-regexp） */
const RE_HTML_TAG = /<[a-z][\s\S]*?>/i;

/* URL処理は共通ユーティリティに委譲 */
export { fixBrokenUnicodeUrl, absoluteMediaSrc } from "@/lib/url-utils";

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

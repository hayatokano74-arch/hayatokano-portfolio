/* タイトル → slug 変換（日本語対応） */

/**
 * タイトル文字列をURLセーフなslugに変換する。
 * 日本語はそのままencodeURIComponentでエンコードし、
 * ASCII文字は小文字化・ハイフン区切りに正規化する。
 */
export function titleToSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** カテゴリ（タグ）は自由文字列。"All" は特別な全件表示用 */
export type Category = string;

/** 投稿のタグ一覧から動的にカテゴリメニューを生成（"All" を先頭に） */
export function buildCategoryMenu(tags: string[]): string[] {
  const unique = [...new Set(tags)];
  return ["All", ...unique];
}

export function parseCategory(value?: string): string {
  if (!value) return "All";
  return value;
}

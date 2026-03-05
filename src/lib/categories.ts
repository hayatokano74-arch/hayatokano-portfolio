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

/**
 * 複数タグ選択対応: URLの ?tags=Video,Photography をパースして配列にする。
 * 旧 ?tag=Video もフォールバック（後方互換）。
 * 未選択時は空配列 = 全件表示。
 */
export function parseTags(sp?: { tags?: string; tag?: string }): string[] {
  if (sp?.tags) return sp.tags.split(",").filter(Boolean);
  if (sp?.tag) return [sp.tag];
  return [];
}

/** 選択中のタグ配列をURLパラメータ文字列に変換する */
export function buildTagsParam(tags: string[]): string {
  if (tags.length === 0) return "";
  return `tags=${tags.join(",")}`;
}

/** フィルターグループの型定義 */
export type FilterGroup = {
  label: string;
  options: { value: string; count: number }[];
};

/** 投稿のタグ一覧からフィルターグループを構築する */
export function buildFilterGroups(
  allTags: string[],
  groupLabel = "Category",
): FilterGroup[] {
  const counts = new Map<string, number>();
  for (const tag of allTags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const options = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, count }));
  return [{ label: groupLabel, options }];
}

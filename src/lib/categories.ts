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

/** URLの ?years=2021,2024 をパースして配列にする */
export function parseYears(sp?: { years?: string }): string[] {
  if (sp?.years) return sp.years.split(",").filter(Boolean);
  return [];
}

/** 選択中のタグ配列をURLパラメータ文字列に変換する */
export function buildTagsParam(tags: string[]): string {
  if (tags.length === 0) return "";
  return `tags=${tags.join(",")}`;
}

/** フィルターグループの型定義 */
export type FilterGroup = {
  /** グループ名（表示用） */
  label: string;
  /** URLパラメータキー（tags, years等） */
  paramKey: string;
  options: { value: string; count: number }[];
};

/** 値リストからフィルターグループを構築する汎用関数 */
function buildGroup(
  label: string,
  paramKey: string,
  values: string[],
  sort: "alpha" | "desc" = "alpha",
): FilterGroup {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const entries = [...counts.entries()];
  if (sort === "desc") {
    entries.sort(([a], [b]) => b.localeCompare(a));
  } else {
    entries.sort(([a], [b]) => a.localeCompare(b));
  }
  const options = entries.map(([value, count]) => ({ value, count }));
  return { label, paramKey, options };
}

/** カテゴリ + Year のフィルターグループを構築する */
export function buildFilterGroups(
  allTags: string[],
  allYears: string[],
): FilterGroup[] {
  const groups: FilterGroup[] = [];
  groups.push(buildGroup("Category", "tags", allTags, "alpha"));
  if (allYears.length > 0) {
    groups.push(buildGroup("Year", "years", allYears, "desc"));
  }
  return groups;
}

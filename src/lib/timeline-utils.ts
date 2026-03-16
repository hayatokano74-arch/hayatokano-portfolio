import type { TimelineItem } from "@/lib/types";

/* ─── 型定義 ─── */
export type ArchiveMonth = {
  month: string;
  key: string;
  count: number;
  dates: string[];
};

export type ArchiveYear = {
  year: string;
  count: number;
  months: ArchiveMonth[];
};

export type DateGroup = {
  date: string;
  items: TimelineItem[];
};

export type ImageItem = NonNullable<TimelineItem["images"]>[number];

/* ─── 純粋関数 ─── */

/** 日付文字列 "2026.02.03 12:36" → 日付部分 "2026.02.03" */
export function dateOnly(date: string): string {
  return date.split(" ")[0];
}

/** 投稿を日付でグルーピング */
export function groupByDate(items: TimelineItem[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const item of items) {
    const d = dateOnly(item.date);
    const last = groups[groups.length - 1];
    if (last && last.date === d) {
      last.items.push(item);
    } else {
      groups.push({ date: d, items: [item] });
    }
  }
  return groups;
}

/** アーカイブツリー構築（年 → 月 → 日付の階層構造） */
export function buildArchiveTree(dates: string[]): ArchiveYear[] {
  const tree: ArchiveYear[] = [];
  /* Map/Set で O(1) ルックアップに最適化 */
  const yearMap = new Map<string, ArchiveYear>();
  const monthMap = new Map<string, ArchiveMonth>();
  const dateSet = new Map<string, Set<string>>();

  for (const d of dates) {
    const [y, m] = d.split(".");

    let yearNode = yearMap.get(y);
    if (!yearNode) {
      yearNode = { year: y, count: 0, months: [] };
      yearMap.set(y, yearNode);
      tree.push(yearNode);
    }
    yearNode.count++;

    const key = `${y}-${m}`;
    let monthNode = monthMap.get(key);
    if (!monthNode) {
      monthNode = { month: m, key, count: 0, dates: [] };
      monthMap.set(key, monthNode);
      yearNode.months.push(monthNode);
      dateSet.set(key, new Set());
    }
    monthNode.count++;

    const seen = dateSet.get(key)!;
    if (!seen.has(d)) {
      seen.add(d);
      monthNode.dates.push(d);
    }
  }
  return tree;
}

/** 月リンクのhref構築（トグル動作） */
export function buildMonthHref(monthKey: string, activeMonth?: string): string {
  const params = new URLSearchParams();
  if (activeMonth !== monthKey) params.set("month", monthKey);
  const qs = params.toString();
  return qs ? `/timeline?${qs}` : "/timeline";
}

/** 日付リンクのhref構築（トグル動作） */
export function buildDateHref(date: string, activeDate?: string): string {
  const params = new URLSearchParams();
  if (activeDate !== date) params.set("date", date);
  const qs = params.toString();
  return qs ? `/timeline?${qs}` : "/timeline";
}

/** タグフィルタのhref構築 */
export function buildTagHref(
  tag: string | undefined,
  activeTag?: string,
  activeMonth?: string,
  activeDate?: string,
): string {
  const params = new URLSearchParams();
  /* トグル動作: 同じタグなら解除、別タグなら切替 */
  if (tag && activeTag !== tag) params.set("tag", tag);
  if (activeMonth) params.set("month", activeMonth);
  if (activeDate) params.set("date", activeDate);
  const qs = params.toString();
  return qs ? `/timeline?${qs}` : "/timeline";
}

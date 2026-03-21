/**
 * Garden ページネーション計算の純粋関数
 * 月グループを投稿数ベースでページに分割し、アーカイブツリーを構築する。
 */

import type { MonthGroup } from "./group-by-month";

/* ─── アーカイブツリーの型定義 ─── */

export type GardenArchiveMonth = {
  label: string;       // "2月"
  groupLabel: string;  // "2026年2月"（MonthGroup.label と一致）
  count: number;
  page: number;        // 1始まり
};

export type GardenArchiveYear = {
  year: string;
  count: number;
  months: GardenArchiveMonth[];
};

/**
 * 月グループを1ヶ月=1ページに分割する。
 * 投稿が少ない月（5件未満）は前の月に統合する。
 */
export function groupIntoPages(groups: MonthGroup[]): MonthGroup[][] {
  if (groups.length === 0) return [];

  const pages: MonthGroup[][] = [];

  for (const group of groups) {
    // 投稿が少なすぎる月は前のページに統合
    if (pages.length > 0 && group.nodes.length < 5) {
      pages[pages.length - 1].push(group);
    } else {
      pages.push([group]);
    }
  }

  return pages;
}

/** pages（MonthGroup[][]）から年→月の2階層ツリーを構築 */
export function buildArchiveTree(pages: MonthGroup[][]): GardenArchiveYear[] {
  const tree: GardenArchiveYear[] = [];
  const yearMap = new Map<string, GardenArchiveYear>();

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    for (const group of pages[pageIdx]) {
      // "2026年2月" → year="2026", monthLabel="2月"
      const match = group.label.match(/^(\d+)年(\d+)月$/);
      if (!match) continue;

      const [, yearStr, monthStr] = match;
      const nodeCount = group.nodes.length;

      let yearNode = yearMap.get(yearStr);
      if (!yearNode) {
        yearNode = { year: yearStr, count: 0, months: [] };
        yearMap.set(yearStr, yearNode);
        tree.push(yearNode);
      }
      yearNode.count += nodeCount;

      // 同じ月が複数ページにまたがることはないので直接追加
      yearNode.months.push({
        label: `${Number(monthStr)}月`,
        groupLabel: group.label,
        count: nodeCount,
        page: pageIdx + 1,
      });
    }
  }
  return tree;
}

/** ページの期間ラベルを生成（実在する月のみ表示） */
export function pageRangeLabel(groups: MonthGroup[]): string {
  if (groups.length === 0) return "";
  if (groups.length === 1) return groups[0].label;

  const newest = groups[0].label; // 新しい方
  const oldest = groups[groups.length - 1].label; // 古い方

  // 同年なら月だけ表示（例: "2025年9月 — 7月"）
  const newestYear = newest.match(/^(\d+)年/);
  const oldestYear = oldest.match(/^(\d+)年/);
  if (newestYear && oldestYear && newestYear[1] === oldestYear[1]) {
    const monthOnly = oldest.replace(/^\d+年/, "");
    return `${newest} — ${monthOnly}`;
  }

  return `${newest} — ${oldest}`;
}

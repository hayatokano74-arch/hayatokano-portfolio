/**
 * Garden ページネーション計算の純粋関数
 * 月グループを投稿数ベースでページに分割し、アーカイブツリーを構築する。
 */

import type { MonthGroup } from "./group-by-month";

/** 1ページあたりの目標投稿数 */
export const NODES_PER_PAGE = 30;

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
 * 月グループを投稿数ベースでページに分割する。
 * - 月グループは絶対に分割しない（1つの月が2ページにまたがらない）
 * - 目標投稿数に達したらページを閉じる
 * - 最後のページが極端に少ない場合は前のページに統合
 */
export function groupIntoPages(groups: MonthGroup[]): MonthGroup[][] {
  if (groups.length === 0) return [];

  const pages: MonthGroup[][] = [];
  let currentPage: MonthGroup[] = [];
  let currentCount = 0;

  for (const group of groups) {
    currentPage.push(group);
    currentCount += group.nodes.length;

    if (currentCount >= NODES_PER_PAGE) {
      pages.push(currentPage);
      currentPage = [];
      currentCount = 0;
    }
  }

  // 残りのグループを処理
  if (currentPage.length > 0) {
    // 最後のページが少なすぎる場合（目標の1/3未満）は前のページに統合
    if (pages.length > 0 && currentCount < Math.floor(NODES_PER_PAGE / 3)) {
      pages[pages.length - 1].push(...currentPage);
    } else {
      pages.push(currentPage);
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

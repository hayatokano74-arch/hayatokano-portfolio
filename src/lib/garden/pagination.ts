/**
 * Garden ページネーション計算の純粋関数
 * ノードを30件ずつページに分割し、アーカイブツリーを構築する。
 */

import type { MonthGroup } from "./group-by-month";
import type { GardenNode } from "./types";

/** 1ページあたりの表示件数 */
export const NODES_PER_PAGE = 15;

/* ─── アーカイブツリーの型定義（年 > 月 > 投稿） ─── */

export type GardenArchivePost = {
  title: string;
  date: string;
  /** このノードが属するページ番号（1始まり） */
  page: number;
};

export type GardenArchiveMonth = {
  label: string;       // "2月"
  groupLabel: string;  // "2026年2月"（MonthGroup.label と一致）
  count: number;
  posts: GardenArchivePost[];
};

export type GardenArchiveYear = {
  year: string;
  count: number;
  months: GardenArchiveMonth[];
};

/**
 * 全ノードを30件ずつフラットに分割する。
 * 月の境界は無視し、純粋に件数で区切る。
 */
export function paginateNodes(nodes: GardenNode[]): GardenNode[][] {
  if (nodes.length === 0) return [];

  const pages: GardenNode[][] = [];
  for (let i = 0; i < nodes.length; i += NODES_PER_PAGE) {
    pages.push(nodes.slice(i, i + NODES_PER_PAGE));
  }
  return pages;
}

/**
 * 旧互換: MonthGroup[][] を返す（GardenGrid が月見出し付きで表示するため）
 * 各ページのノードを月グループに再分割する。
 */
export function groupIntoPages(allGroups: MonthGroup[]): MonthGroup[][] {
  /* まず全ノードをフラットにして30件ずつ分割 */
  const allNodes = allGroups.flatMap((g) => g.nodes);
  const flatPages = paginateNodes(allNodes);

  /* 各ページ内のノードを月でグループ化 */
  return flatPages.map((pageNodes) => {
    const groups: MonthGroup[] = [];
    let currentLabel = "";

    for (const node of pageNodes) {
      const d = new Date(node.date);
      const label = isNaN(d.getTime())
        ? "日付不明"
        : `${d.getFullYear()}年${d.getMonth() + 1}月`;

      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, nodes: [node] });
      } else {
        groups[groups.length - 1].nodes.push(node);
      }
    }
    return groups;
  });
}

/** 全ノードから年→月→投稿の3階層ツリーを構築 */
export function buildArchiveTree(nodes: GardenNode[]): GardenArchiveYear[] {
  const tree: GardenArchiveYear[] = [];
  const yearMap = new Map<string, GardenArchiveYear>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const d = new Date(node.date);
    if (isNaN(d.getTime())) continue;

    const yearStr = String(d.getFullYear());
    const monthNum = d.getMonth() + 1;
    const groupLabel = `${yearStr}年${monthNum}月`;
    const page = Math.floor(i / NODES_PER_PAGE) + 1;

    let yearNode = yearMap.get(yearStr);
    if (!yearNode) {
      yearNode = { year: yearStr, count: 0, months: [] };
      yearMap.set(yearStr, yearNode);
      tree.push(yearNode);
    }
    yearNode.count++;

    /* 月ノードを探すか作成 */
    let monthNode = yearNode.months.find((m) => m.groupLabel === groupLabel);
    if (!monthNode) {
      monthNode = {
        label: `${monthNum}月`,
        groupLabel,
        count: 0,
        posts: [],
      };
      yearNode.months.push(monthNode);
    }
    monthNode.count++;
    monthNode.posts.push({
      title: node.title,
      date: node.date,
      page,
    });
  }

  return tree;
}

/** ページの期間ラベルを生成 */
export function pageRangeLabel(groups: MonthGroup[]): string {
  if (groups.length === 0) return "";
  if (groups.length === 1) return groups[0].label;

  const newest = groups[0].label;
  const oldest = groups[groups.length - 1].label;

  const newestYear = newest.match(/^(\d+)年/);
  const oldestYear = oldest.match(/^(\d+)年/);
  if (newestYear && oldestYear && newestYear[1] === oldestYear[1]) {
    const monthOnly = oldest.replace(/^\d+年/, "");
    return `${newest} — ${monthOnly}`;
  }

  return `${newest} — ${oldest}`;
}

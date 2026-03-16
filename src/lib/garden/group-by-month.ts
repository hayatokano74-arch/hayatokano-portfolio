/**
 * Garden ノードを年月でグループ化する純粋関数
 */

import type { GardenNode } from "./types";

/** 月グループの型 */
export interface MonthGroup {
  label: string;
  nodes: GardenNode[];
}

/** 日付文字列から年月ラベルを生成 */
export function toYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "日付不明";
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** ノードを年月でグループ化（降順前提） */
export function groupByYearMonth(nodes: GardenNode[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let currentLabel = "";

  for (const node of nodes) {
    const label = toYearMonth(node.date);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, nodes: [node] });
    } else {
      groups[groups.length - 1].nodes.push(node);
    }
  }

  return groups;
}

"use client";

import { useState } from "react";
import type { GardenNodeSummary } from "@/lib/garden/types";
import { GardenNodeCard } from "./GardenNodeCard";

interface MonthGroup {
  label: string;
  nodes: GardenNodeSummary[];
}

interface GardenGridProps {
  /** 現在のページに表示するグループ */
  groups: MonthGroup[];
  /** 全ノード数（通し番号の計算用） */
  totalNodes: number;
  /** 現在ページより前のノード数（通し番号のオフセット） */
  allGroups: MonthGroup[];
  /** 現在のページ番号 */
  safePage: number;
}

export function GardenGrid({ groups, totalNodes, allGroups, safePage }: GardenGridProps) {
  // 最新グループは展開、それ以降は折りたたみ
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (groups.length > 0) initial.add(groups[0].label);
    return initial;
  });

  if (groups.length === 0) {
    return <p style={{ color: "var(--muted)" }}>まだノードがありません。</p>;
  }

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // 前のページまでのノード数を計算（通し番号用）
  const MONTHS_PER_PAGE = 3;
  const prevPageMonths = allGroups.slice(0, (safePage - 1) * MONTHS_PER_PAGE);
  const prevNodeCount = prevPageMonths.reduce((sum, g) => sum + g.nodes.length, 0);

  let runningIndex = prevNodeCount;

  return (
    <div className="garden-sections">
      {groups.map((group) => {
        const isOpen = expanded.has(group.label);
        const startIndex = runningIndex;
        runningIndex += group.nodes.length;

        return (
          <section key={group.label} className="garden-section">
            <button
              className={`garden-section-heading ${isOpen ? "garden-section-heading--open" : ""}`}
              onClick={() => toggle(group.label)}
              type="button"
            >
              <span>{group.label}</span>
              <span className="garden-section-meta">
                {isOpen ? "" : `${group.nodes.length}件`}
              </span>
            </button>
            {isOpen && (
              <div className="garden-list">
                {group.nodes.map((node, i) => (
                  <GardenNodeCard
                    key={node.slug}
                    node={node}
                    index={totalNodes - startIndex - i}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

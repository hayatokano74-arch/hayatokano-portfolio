"use client";

import { useState } from "react";
import type { GardenNode } from "@/lib/garden/types";
import { GardenNodeCard } from "./GardenNodeCard";

/** 年月ラベルを生成（例: "2026年2月"） */
function toYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "日付不明";
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** ノードを年月でグループ化（降順前提） */
function groupByYearMonth(nodes: GardenNode[]) {
  const groups: { label: string; nodes: GardenNode[] }[] = [];
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

export function GardenGrid({ nodes }: { nodes: GardenNode[] }) {
  const groups = groupByYearMonth(nodes);

  // 最新月は展開、それ以降は折りたたみ
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (groups.length > 0) initial.add(groups[0].label);
    return initial;
  });

  if (nodes.length === 0) {
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

  // 通し番号を維持
  let runningIndex = 0;

  return (
    <div className="garden-sections">
      {groups.map((group) => {
        const isOpen = expanded.has(group.label);
        // 通し番号を展開状態に関わらず進める
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
                    index={startIndex + i + 1}
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

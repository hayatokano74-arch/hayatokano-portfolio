"use client";

import type { GardenNode } from "@/lib/garden/types";
import { GardenNodeCard } from "./GardenNodeCard";

interface MonthGroup {
  label: string;
  nodes: GardenNode[];
}

interface GardenGridProps {
  /** 現在のページに表示するグループ */
  groups: MonthGroup[];
}

export function GardenGrid({ groups }: GardenGridProps) {
  if (groups.length === 0) {
    return <p style={{ color: "var(--muted)" }}>まだノードがありません。</p>;
  }

  /* 全グループのノードをフラットに展開 */
  const allNodes = groups.flatMap((g) => g.nodes);

  return (
    <div className="garden-sections">
      <div className="garden-list">
        {allNodes.map((node) => (
          <GardenNodeCard
            key={node.slug}
            node={node}
          />
        ))}
      </div>
    </div>
  );
}

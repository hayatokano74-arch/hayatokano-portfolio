"use client";

import { useState, useEffect } from "react";
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
  // 全グループを展開状態で表示（ページ切替時にリセット）
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.label)),
  );

  useEffect(() => {
    setExpanded(new Set(groups.map((g) => g.label)));
  }, [groups]);

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

  return (
    <div className="garden-sections">
      {groups.map((group) => {
        const isOpen = expanded.has(group.label);

        return (
          <section key={group.label} className="garden-section">
            <button
              className={`garden-section-heading ${isOpen ? "garden-section-heading--open" : ""}`}
              onClick={() => toggle(group.label)}
              type="button"
            >
              <span className="garden-section-label">
                <span className="garden-section-chevron">{isOpen ? "▾" : "▸"}</span>
                {group.label}
              </span>
              <span className="garden-section-meta">
                {group.nodes.length}件
              </span>
            </button>
            {isOpen && (
              <div className="garden-list">
                {group.nodes.map((node) => (
                  <GardenNodeCard
                    key={node.slug}
                    node={node}
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

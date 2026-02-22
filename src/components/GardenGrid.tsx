import type { GardenNode } from "@/lib/garden/types";
import { GardenNodeCard } from "./GardenNodeCard";

/** 年月ラベルを生成（例: "2026年2月"） */
function toYearMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "日付不明";
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** ノードを年月でグループ化（降順） */
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
  if (nodes.length === 0) {
    return <p style={{ color: "var(--muted)" }}>まだノードがありません。</p>;
  }

  const groups = groupByYearMonth(nodes);
  // 通し番号を維持
  let runningIndex = 0;

  return (
    <div className="garden-sections">
      {groups.map((group) => (
        <section key={group.label} className="garden-section">
          <h3 className="garden-section-heading">{group.label}</h3>
          <div className="garden-grid">
            {group.nodes.map((node) => {
              runningIndex += 1;
              return (
                <GardenNodeCard
                  key={node.slug}
                  node={node}
                  index={runningIndex}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

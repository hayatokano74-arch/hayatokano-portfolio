import type { GardenNode } from "@/lib/garden/types";
import { GardenNodeCard } from "./GardenNodeCard";

export function GardenGrid({ nodes }: { nodes: GardenNode[] }) {
  if (nodes.length === 0) {
    return <p style={{ color: "var(--muted)" }}>まだノードがありません。</p>;
  }

  return (
    <div className="garden-list">
      {nodes.map((node) => (
        <GardenNodeCard key={node.slug} node={node} />
      ))}
    </div>
  );
}

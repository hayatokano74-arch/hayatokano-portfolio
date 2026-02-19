"use client";

import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import type { GardenNode } from "@/lib/garden/types";
import { GardenNodeCard } from "./GardenNodeCard";

export function GardenGrid({ nodes }: { nodes: GardenNode[] }) {
  if (nodes.length === 0) {
    return <p style={{ color: "var(--muted)" }}>まだノードがありません。</p>;
  }

  return (
    <ResponsiveMasonry columnsCountBreakPoints={{ 0: 1, 900: 2, 1100: 3 }}>
      <Masonry gutter="var(--grid-gutter)" sequential>
        {nodes.map((node) => (
          <GardenNodeCard key={node.slug} node={node} />
        ))}
      </Masonry>
    </ResponsiveMasonry>
  );
}

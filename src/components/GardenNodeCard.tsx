import Link from "next/link";
import type { GardenNode } from "@/lib/garden/types";

export function GardenNodeCard({ node, index }: { node: GardenNode; index: number }) {
  const num = String(index).padStart(2, "0");

  return (
    <div className={`garden-card garden-card--${node.type}`}>
      <div className="garden-card-meta">
        <span className="garden-card-index">{num}</span>
        <time className="garden-card-date">{node.date}</time>
      </div>
      <Link href={`/garden/${encodeURIComponent(node.slug)}`} className="garden-card-title-link action-link">
        <h2 className="garden-card-title">{node.title}</h2>
      </Link>
      <div
        className="garden-card-body"
        dangerouslySetInnerHTML={{ __html: node.contentHtml }}
      />
    </div>
  );
}

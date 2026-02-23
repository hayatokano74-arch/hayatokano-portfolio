import Link from "next/link";
import type { GardenNodeSummary } from "@/lib/garden/types";

export function GardenNodeCard({ node, index }: { node: GardenNodeSummary; index: number }) {
  const num = String(index).padStart(2, "0");

  return (
    <article className="garden-entry">
      <div className="garden-entry-meta">
        <span className="garden-entry-index">{num}</span>
        <time className="garden-entry-date">{node.date}</time>
      </div>
      <Link href={`/garden/${encodeURIComponent(node.slug)}`} className="garden-entry-title-link action-link">
        <h2 className="garden-entry-title">{node.title}</h2>
      </Link>
      {node.excerpt && (
        <p className="garden-entry-excerpt">{node.excerpt}</p>
      )}
    </article>
  );
}

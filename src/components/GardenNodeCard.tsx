import Link from "next/link";
import type { GardenNode } from "@/lib/garden/types";

export function GardenNodeCard({ node }: { node: GardenNode }) {
  return (
    <Link href={`/garden/${encodeURIComponent(node.slug)}`} className="garden-card action-link">
      <time className="garden-card-date">{node.date}</time>
      <h2 className="garden-card-title">{node.title}</h2>
      <p className="garden-card-excerpt">{node.excerpt}</p>
      {node.tags.length > 0 && (
        <div className="garden-card-tags">
          {node.tags.map((tag) => (
            <span key={tag} className="garden-card-tag">{tag}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

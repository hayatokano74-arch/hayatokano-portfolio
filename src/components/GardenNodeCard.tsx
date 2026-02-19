import Link from "next/link";
import type { GardenNode } from "@/lib/garden/types";

export function GardenNodeCard({ node }: { node: GardenNode }) {
  return (
    <div className={`garden-card garden-card--${node.type}`}>
      <div className="garden-card-header">
        <time className="garden-card-date">{node.date}</time>
        {node.tags.length > 0 && (
          <div className="garden-card-tags">
            {node.tags.map((tag) => (
              <span key={tag} className="garden-card-tag">{tag}</span>
            ))}
          </div>
        )}
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

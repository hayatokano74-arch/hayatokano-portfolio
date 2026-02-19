import Link from "next/link";
import type { BacklinkEntry } from "@/lib/garden/types";

export function GardenBacklinks({ backlinks }: { backlinks: BacklinkEntry[] }) {
  if (backlinks.length === 0) return null;

  return (
    <section className="garden-backlinks">
      <h2 className="garden-backlinks-heading">Backlinks</h2>
      <ul className="garden-backlinks-list">
        {backlinks.map((bl) => (
          <li key={bl.slug} className="garden-backlink-item">
            <Link href={`/garden/${encodeURIComponent(bl.slug)}`} className="garden-backlink-title action-link">
              {bl.title}
            </Link>
            <p className="garden-backlink-context">{bl.context}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

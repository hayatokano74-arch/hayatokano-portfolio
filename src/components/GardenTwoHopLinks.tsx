import Link from "next/link";
import type { TwoHopEntry } from "@/lib/garden/types";

export function GardenTwoHopLinks({ links }: { links: TwoHopEntry[] }) {
  if (links.length === 0) return null;

  return (
    <section className="garden-twohop">
      <h2 className="garden-section-heading"><span className="garden-section-icon">↝</span> 関連ページ</h2>
      <ul className="garden-twohop-list">
        {links.map((entry) => (
          <li key={entry.slug} className="garden-twohop-item">
            <Link href={`/garden/${encodeURIComponent(entry.slug)}`} className="garden-twohop-title action-link">
              {entry.title}
            </Link>
            <span className="garden-twohop-via">{entry.via}（経由）</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

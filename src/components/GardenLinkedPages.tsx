import Link from "next/link";
import type { LinkedPageSummary } from "@/lib/garden/types";

export function GardenLinkedPages({ pages }: { pages: LinkedPageSummary[] }) {
  if (pages.length === 0) return null;

  return (
    <section className="garden-linked">
      <h2 className="garden-section-heading"><span className="garden-section-icon">←</span> リンク</h2>
      <ul className="garden-linked-list">
        {pages.map((page) => (
          <li key={page.slug} className="garden-linked-card">
            <Link
              href={`/garden/${encodeURIComponent(page.slug)}`}
              className="garden-linked-card-link"
            >
              <span className="garden-linked-card-title">{page.title}</span>
              {page.excerpt && (
                <p className="garden-linked-card-excerpt">{page.excerpt}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";
import type { TwoHopGroup } from "@/lib/garden/types";

export function GardenTwoHopLinks({ groups }: { groups: TwoHopGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="garden-twohop">
      <h2 className="garden-section-heading"><span className="garden-section-icon">↝</span> 関連ページ</h2>
      <div className="garden-twohop-groups">
        {groups.map((group) => (
          <div key={group.viaSlug} className="garden-twohop-group">
            <Link
              href={`/garden/${encodeURIComponent(group.viaSlug)}`}
              className="garden-twohop-via action-link"
            >
              {group.via}
            </Link>
            <ul className="garden-twohop-pages">
              {group.pages.map((page) => (
                <li key={page.slug} className="garden-twohop-card">
                  <Link
                    href={`/garden/${encodeURIComponent(page.slug)}`}
                    className="garden-twohop-card-link"
                  >
                    <span className="garden-twohop-card-title">{page.title}</span>
                    {page.excerpt && (
                      <p className="garden-twohop-card-excerpt">{page.excerpt}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

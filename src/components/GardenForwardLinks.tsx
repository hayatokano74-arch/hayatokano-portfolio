import Link from "next/link";
import type { ForwardLinkEntry } from "@/lib/garden/types";

export function GardenForwardLinks({ links }: { links: ForwardLinkEntry[] }) {
  if (links.length === 0) return null;

  return (
    <section className="garden-forward-links">
      <h2 className="garden-section-heading"><span className="garden-section-icon">→</span> リンク</h2>
      <ul className="garden-forward-links-list">
        {links.map((link) => (
          <li key={link.slug}>
            <Link
              href={`/garden/${encodeURIComponent(link.slug)}`}
              className="garden-forward-link action-link"
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

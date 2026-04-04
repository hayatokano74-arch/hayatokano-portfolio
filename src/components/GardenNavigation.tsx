import Link from "next/link";

interface AdjacentNode {
  slug: string;
  title: string;
  date: string;
}

/**
 * Garden 詳細ページの前後ナビゲーション
 * prev = より古い記事、next = より新しい記事
 */
export function GardenNavigation({
  prev,
  next,
}: {
  prev: AdjacentNode | null;
  next: AdjacentNode | null;
}) {
  return (
    <nav className="garden-nav" aria-label="前後の記事">
      {prev ? (
        <Link
          href={`/garden/${encodeURIComponent(prev.slug)}`}
          className="garden-nav-link garden-nav-prev"
        >
          <span className="garden-nav-label">← 前の記事</span>
          <span className="garden-nav-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/garden/${encodeURIComponent(next.slug)}`}
          className="garden-nav-link garden-nav-next"
        >
          <span className="garden-nav-label">次の記事 →</span>
          <span className="garden-nav-title">{next.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

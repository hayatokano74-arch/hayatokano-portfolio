import Link from "next/link";
import type { TimelineItem } from "@/lib/types";
import { TimelineImageGrid } from "./TimelinePhoto";

/** 個別の投稿カード */
export function TimelinePost({ item }: { item: TimelineItem }) {
  const time = item.date.split(" ")[1] ?? "";

  return (
    <article id={item.id} style={{ scrollMarginTop: "var(--space-11)", paddingTop: "var(--space-4)", paddingBottom: "var(--space-2)" }}>
      {item.type === "photo" && item.images && item.images.length > 0 ? (
        <TimelineImageGrid images={item.images} />
      ) : null}

      {/* タイトル（任意ラベル） */}
      {item.title && (
        <div
          style={{
            marginTop: item.type === "photo" ? "var(--space-3)" : 0,
            fontSize: "var(--font-body)",
            lineHeight: "var(--lh-normal)",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {item.title}
        </div>
      )}

      {item.text ? (
        <div
          style={{
            marginTop: item.title ? "var(--space-2)" : (item.type === "photo" ? "var(--space-3)" : 0),
            fontSize: "var(--font-body)",
            lineHeight: "var(--lh-relaxed)",
            fontWeight: 500,
            whiteSpace: "pre-wrap",
          }}
        >
          {item.text}
        </div>
      ) : null}

      {/* タグ表示 */}
      {item.tags && item.tags.length > 0 && (
        <div className="timeline-post-tags">
          {item.tags.map((tag) => (
            <Link
              key={tag}
              href={`/timeline?tag=${encodeURIComponent(tag)}`}
              className="action-link timeline-post-tag"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* 時刻表示（アンカーリンク） */}
      <a
        href={`#${item.id}`}
        className="action-link action-link-muted"
        style={{ display: "inline-block", marginTop: "var(--space-3)", fontSize: "var(--font-meta)", lineHeight: "var(--lh-normal)", letterSpacing: "0.04em" }}
      >
        {time}
      </a>
    </article>
  );
}

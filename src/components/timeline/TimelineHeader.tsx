import Link from "next/link";
import { buildTagHref } from "@/lib/timeline-utils";

/** フィルタタブ（タグ切替） */
export function FilterTabs({
  activeMonth,
  activeDate,
  activeTag,
  availableTags,
}: {
  activeMonth?: string;
  activeDate?: string;
  activeTag?: string;
  availableTags: string[];
}) {
  return (
    <nav className="timeline-filter-tabs">
      <Link
        href={buildTagHref(undefined, activeTag, activeMonth, activeDate)}
        className={`${!activeTag ? "underline-active" : ""} action-link`.trim()}
        style={{ color: !activeTag ? "var(--fg)" : "var(--muted)" }}
      >
        すべて
      </Link>
      {availableTags.map((tag) => {
        const isActive = activeTag === tag;
        return (
          <Link
            key={tag}
            href={buildTagHref(tag, activeTag, activeMonth, activeDate)}
            className={`${isActive ? "underline-active" : ""} action-link`.trim()}
            style={{ color: isActive ? "var(--fg)" : "var(--muted)", whiteSpace: "nowrap" }}
          >
            #{tag}
          </Link>
        );
      })}
    </nav>
  );
}

/** アクティブフィルタ表示（解除リンク付き） */
export function ActiveFilter({
  activeDate,
  activeMonth,
  activeTag,
}: {
  activeDate?: string;
  activeMonth?: string;
  activeTag?: string;
}) {
  if (!activeDate && !activeMonth && !activeTag) return null;

  const parts: string[] = [];
  if (activeTag) parts.push(`#${activeTag}`);
  if (activeDate) parts.push(activeDate);
  else if (activeMonth) parts.push(`${activeMonth.replace("-", "年")}月`);
  const label = parts.join(" / ");

  return (
    <div style={{ marginBottom: "var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span style={{ fontSize: "var(--font-body)", fontWeight: 700, lineHeight: "var(--lh-normal)" }}>
        {label}
      </span>
      <Link
        href="/timeline"
        className="action-link action-link-muted"
        style={{ fontSize: "var(--font-meta)", lineHeight: "var(--lh-normal)" }}
      >
        ✕ 解除
      </Link>
    </div>
  );
}

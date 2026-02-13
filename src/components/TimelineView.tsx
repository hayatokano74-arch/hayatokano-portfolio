"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import type { TimelineItem } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

/* 日付文字列 "2026.02.03 12:36" → 日付部分 "2026.02.03" */
function dateOnly(date: string) {
  return date.split(" ")[0];
}

/* 投稿を日付でグルーピング */
function groupByDate(items: TimelineItem[]) {
  const groups: { date: string; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const d = dateOnly(item.date);
    const last = groups[groups.length - 1];
    if (last && last.date === d) {
      last.items.push(item);
    } else {
      groups.push({ date: d, items: [item] });
    }
  }
  return groups;
}

/* ─── アーカイブツリーのデータ構造 ─── */
type ArchiveMonth = { month: string; key: string; count: number; dates: string[] };
type ArchiveYear = { year: string; count: number; months: ArchiveMonth[] };

function buildArchiveTree(dates: string[]): ArchiveYear[] {
  const tree: ArchiveYear[] = [];
  for (const d of dates) {
    const [y, m] = d.split(".");
    let yearNode = tree.find((t) => t.year === y);
    if (!yearNode) {
      yearNode = { year: y, count: 0, months: [] };
      tree.push(yearNode);
    }
    yearNode.count++;
    const key = `${y}-${m}`;
    let monthNode = yearNode.months.find((mn) => mn.key === key);
    if (!monthNode) {
      monthNode = { month: m, key, count: 0, dates: [] };
      yearNode.months.push(monthNode);
    }
    monthNode.count++;
    if (!monthNode.dates.includes(d)) {
      monthNode.dates.push(d);
    }
  }
  return tree;
}

/* ─── 三角形アイコン ─── */
function ToggleArrow({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 8,
        fontSize: 8,
        lineHeight: 1,
        transition: "transform 120ms ease",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        color: "var(--muted)",
      }}
    >
      ▶
    </span>
  );
}

/* ─── 写真投稿の1枚表示 ─── */
function TimelineImage({ image }: { image: TimelineItem["images"] extends (infer T)[] | undefined ? T : never }) {
  if (!image) return null;
  return (
    <div
      style={{
        position: "relative",
        width: "min(60%, 400px)",
        aspectRatio: `${image.width} / ${image.height}`,
        overflow: "hidden",
      }}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        loading="lazy"
        sizes="(max-width: 900px) 60vw, 400px"
        placeholder="blur"
        blurDataURL={blurDataURL(image.width, image.height)}
        style={{ objectFit: "cover" }}
      />
    </div>
  );
}

/* ─── 個別の投稿カード ─── */
function TimelinePost({ item }: { item: TimelineItem }) {
  const time = item.date.split(" ")[1] ?? "";

  return (
    <article id={item.id} style={{ scrollMarginTop: "var(--space-11)", paddingTop: "var(--space-4)", paddingBottom: "var(--space-2)" }}>
      {item.type === "photo" && item.images && item.images.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {item.images.map((img, idx) => (
            <TimelineImage key={idx} image={img} />
          ))}
        </div>
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

/* ─── フィルタタブ ─── */
function FilterTabs({
  activeType,
  activeMonth,
  activeDate,
  activeTag,
  availableTags,
}: {
  activeType?: string;
  activeMonth?: string;
  activeDate?: string;
  activeTag?: string;
  availableTags: string[];
}) {
  const tabs = [
    { label: "すべて", value: undefined },
    { label: "写真", value: "photo" },
    { label: "テキスト", value: "text" },
  ] as const;

  function buildHref(type?: string, tag?: string) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (tag) params.set("tag", tag);
    if (activeMonth) params.set("month", activeMonth);
    if (activeDate) params.set("date", activeDate);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  function buildTagHref(tag: string) {
    const params = new URLSearchParams();
    if (activeType) params.set("type", activeType);
    /* トグル動作: 同じタグなら解除、別タグなら切替 */
    if (activeTag !== tag) params.set("tag", tag);
    if (activeMonth) params.set("month", activeMonth);
    if (activeDate) params.set("date", activeDate);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  return (
    <nav className="timeline-filter-tabs">
      {tabs.map((tab) => {
        const isActive = activeType === tab.value || (!activeType && !tab.value);
        return (
          <Link
            key={tab.label}
            href={buildHref(tab.value, activeTag)}
            className={`${isActive ? "underline-active" : ""} action-link`.trim()}
            style={{ color: isActive ? "var(--fg)" : "var(--muted)" }}
          >
            {tab.label}
          </Link>
        );
      })}
      {availableTags.length > 0 && (
        <>
          <span className="timeline-filter-separator" aria-hidden="true">·</span>
          {availableTags.map((tag) => {
            const isActive = activeTag === tag;
            return (
              <Link
                key={tag}
                href={buildTagHref(tag)}
                className={`${isActive ? "underline-active" : ""} action-link timeline-filter-tag`.trim()}
                style={{ color: isActive ? "var(--fg)" : "var(--muted)" }}
              >
                #{tag}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}

/* ─── Blogger 風アーカイブサイドバー ─── */
function ArchiveSidebar({
  allDates,
  activeMonth,
  activeDate,
  activeType,
}: {
  allDates: string[];
  activeMonth?: string;
  activeDate?: string;
  activeType?: string;
}) {
  const tree = useMemo(() => buildArchiveTree(allDates), [allDates]);
  /* 開閉状態: "2026" や "2026-02" をキーとして管理 */
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree.length > 0) initial.add(tree[0].year);
    return initial;
  });

  const toggle = useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /* 月リンク: クリックで月フィルタ（トグル動作） */
  function buildMonthHref(monthKey: string) {
    const params = new URLSearchParams();
    if (activeType) params.set("type", activeType);
    if (activeMonth !== monthKey) params.set("month", monthKey);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  /* 日付リンク: クリックでその日だけ表示（トグル動作） */
  function buildDateHref(date: string) {
    const params = new URLSearchParams();
    if (activeType) params.set("type", activeType);
    if (activeDate !== date) params.set("date", date);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  const btnStyle = {
    border: 0,
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  } as const;

  return (
    <aside className="timeline-sidebar">
      <div style={{ paddingTop: "var(--space-2)" }}>
      {tree.map((yearNode) => {
        const yearOpen = openKeys.has(yearNode.year);
        return (
          <div key={yearNode.year} style={{ marginBottom: "var(--space-3)" }}>
            {/* 年ラベル */}
            <button
              type="button"
              onClick={() => toggle(yearNode.year)}
              style={{
                ...btnStyle,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "var(--font-body)",
                lineHeight: "var(--lh-normal)",
                fontWeight: 700,
                color: "var(--fg)",
              }}
            >
              <ToggleArrow open={yearOpen} />
              <span>{yearNode.year}</span>
              <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                ({yearNode.count})
              </span>
            </button>

            {/* 月一覧 */}
            {yearOpen ? (
              <div style={{ paddingLeft: 16, marginTop: "var(--space-1)" }}>
                {yearNode.months.map((monthNode) => {
                  const monthOpen = openKeys.has(monthNode.key);
                  const isMonthActive = activeMonth === monthNode.key;
                  return (
                    <div key={monthNode.key} style={{ marginBottom: "var(--space-1)" }}>
                      {/* 月ラベル: ▶ はトグル、月名はフィルタリンク */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>
                        <button
                          type="button"
                          onClick={() => toggle(monthNode.key)}
                          style={{ ...btnStyle, display: "inline-flex", alignItems: "center" }}
                        >
                          <ToggleArrow open={monthOpen} />
                        </button>
                        <Link
                          href={buildMonthHref(monthNode.key)}
                          className={`${isMonthActive ? "underline-active" : ""} action-link`.trim()}
                          style={{
                            fontWeight: isMonthActive ? 700 : 500,
                            color: isMonthActive ? "var(--fg)" : "var(--muted)",
                          }}
                        >
                          {Number(monthNode.month)}月
                        </Link>
                        <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                          ({monthNode.count})
                        </span>
                      </div>

                      {/* 日付一覧: クリックでその日の投稿だけ表示 */}
                      {monthOpen ? (
                        <div style={{ paddingLeft: 16, marginTop: 0 }}>
                          {monthNode.dates.map((d) => {
                            const isDateActive = activeDate === d;
                            return (
                              <Link
                                key={d}
                                href={buildDateHref(d)}
                                className={`${isDateActive ? "underline-active" : ""} action-link`.trim()}
                                style={{
                                  display: "block",
                                  fontSize: "var(--font-meta)",
                                  lineHeight: "var(--lh-normal)",
                                  fontWeight: isDateActive ? 700 : 400,
                                  color: isDateActive ? "var(--fg)" : "var(--muted)",
                                }}
                              >
                                {d}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      </div>
    </aside>
  );
}

/* ─── モバイル用インラインアーカイブ（簡易版） ─── */
function MobileArchive({
  allDates,
  activeMonth,
  activeDate,
  activeType,
}: {
  allDates: string[];
  activeMonth?: string;
  activeDate?: string;
  activeType?: string;
}) {
  const [open, setOpen] = useState(false);
  const tree = useMemo(() => buildArchiveTree(allDates), [allDates]);

  function buildMonthHref(monthKey: string) {
    const params = new URLSearchParams();
    if (activeType) params.set("type", activeType);
    if (activeMonth !== monthKey) params.set("month", monthKey);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  return (
    <div className="timeline-mobile-archive">
      <button
        type="button"
        className="action-link"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: 0,
          background: "transparent",
          padding: 0,
          fontSize: "var(--font-body)",
          lineHeight: "var(--lh-normal)",
          fontWeight: 500,
          color: "var(--muted)",
        }}
      >
        Archive {open ? "−" : "+"}
      </button>
      {open ? (
        <div style={{ marginTop: "var(--space-3)", display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          {tree.flatMap((y) =>
            y.months.map((m) => {
              const isActive = activeMonth === m.key;
              return (
                <Link
                  key={m.key}
                  href={buildMonthHref(m.key)}
                  className={`${isActive ? "underline-active" : ""} action-link`.trim()}
                  onClick={() => setOpen(false)}
                  style={{
                    fontSize: "var(--font-meta)",
                    lineHeight: "var(--lh-normal)",
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? "var(--fg)" : "var(--muted)",
                  }}
                >
                  {y.year}/{Number(m.month)}月 ({m.count})
                </Link>
              );
            }),
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ─── アクティブフィルタ表示 ─── */
function ActiveFilter({ activeDate, activeMonth, activeType, activeTag }: { activeDate?: string; activeMonth?: string; activeType?: string; activeTag?: string }) {
  if (!activeDate && !activeMonth && !activeTag) return null;

  const parts: string[] = [];
  if (activeDate) parts.push(activeDate);
  else if (activeMonth) parts.push(`${activeMonth.replace("-", "年")}月`);
  if (activeTag) parts.push(`#${activeTag}`);
  const label = parts.join(" ");

  /* フィルタ解除リンク: type は維持、date/month/tag を解除 */
  const params = new URLSearchParams();
  if (activeType) params.set("type", activeType);
  const qs = params.toString();
  const clearHref = qs ? `/timeline?${qs}` : "/timeline";

  return (
    <div style={{ marginBottom: "var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
      <span style={{ fontSize: "var(--font-body)", fontWeight: 700, lineHeight: "var(--lh-normal)" }}>
        {label}
      </span>
      <Link
        href={clearHref}
        className="action-link action-link-muted"
        style={{ fontSize: "var(--font-meta)", lineHeight: "var(--lh-normal)" }}
      >
        ✕ 解除
      </Link>
    </div>
  );
}

/* ─── メインビュー ─── */
export function TimelineView({
  items,
  activeType,
  activeMonth,
  activeDate,
  activeTag,
  availableMonths,
  availableTags,
  allDates,
}: {
  items: TimelineItem[];
  activeType?: string;
  activeMonth?: string;
  activeDate?: string;
  activeTag?: string;
  availableMonths: string[];
  availableTags: string[];
  allDates: string[];
}) {
  const groups = groupByDate(items);

  return (
    <div style={{ marginTop: "var(--space-6)" }}>
      {/* フィルタタブ: 12カラムグリッドに直接配置 */}
      <div className="timeline-layout">
        <div className="timeline-filter-tabs-wrap">
          <FilterTabs activeType={activeType} activeMonth={activeMonth} activeDate={activeDate} activeTag={activeTag} availableTags={availableTags} />
        </div>
      </div>

      {/* メインレイアウト: 12カラムグリッド */}
      <div className="timeline-layout" style={{ marginTop: "var(--space-6)" }}>
        {/* コンテンツ */}
        <div className="timeline-content">
            <MobileArchive allDates={allDates} activeMonth={activeMonth} activeDate={activeDate} activeType={activeType} />
            <ActiveFilter activeDate={activeDate} activeMonth={activeMonth} activeType={activeType} activeTag={activeTag} />
            {groups.length === 0 ? (
              <div style={{ fontSize: "var(--font-body)", fontWeight: 500, color: "var(--muted)" }}>
                投稿がありません
              </div>
            ) : null}

            {groups.map((group, groupIdx) => (
              <div key={group.date} style={{ paddingTop: groupIdx > 0 ? "var(--space-9)" : 0 }}>
                {groupIdx > 0 ? (
                  <div className="hrline" style={{ marginBottom: "var(--space-9)" }} />
                ) : null}

                <div style={{ marginBottom: "var(--space-2)" }}>
                  <span style={{ fontSize: "var(--font-body)", fontWeight: 700, letterSpacing: "0.04em" }}>
                    {group.date}
                  </span>
                </div>

                {group.items.map((item) => (
                  <TimelinePost key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>

        {/* サイドバー（デスクトップのみ） */}
        <ArchiveSidebar allDates={allDates} activeMonth={activeMonth} activeDate={activeDate} activeType={activeType} />
      </div>
    </div>
  );
}

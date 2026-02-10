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

      {item.text ? (
        <div
          style={{
            marginTop: item.type === "photo" ? "var(--space-3)" : 0,
            fontSize: "var(--font-body)",
            lineHeight: "var(--lh-relaxed)",
            fontWeight: 500,
            whiteSpace: "pre-wrap",
          }}
        >
          {item.text}
        </div>
      ) : null}

      <Link
        href={`/timeline/${item.id}`}
        className="action-link action-link-muted"
        style={{ display: "inline-block", marginTop: "var(--space-3)", fontSize: "var(--font-meta)", lineHeight: "var(--lh-normal)", letterSpacing: "0.04em" }}
      >
        {time}
      </Link>
    </article>
  );
}

/* ─── フィルタタブ ─── */
function FilterTabs({
  activeType,
  activeMonth,
}: {
  activeType?: string;
  activeMonth?: string;
}) {
  const tabs = [
    { label: "すべて", value: undefined },
    { label: "写真", value: "photo" },
    { label: "テキスト", value: "text" },
  ] as const;

  function buildHref(type?: string) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (activeMonth) params.set("month", activeMonth);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-6)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 500 }}>
      {tabs.map((tab) => {
        const isActive = activeType === tab.value || (!activeType && !tab.value);
        return (
          <Link
            key={tab.label}
            href={buildHref(tab.value)}
            className={`${isActive ? "underline-active" : ""} action-link`.trim()}
            style={{ color: isActive ? "var(--fg)" : "var(--muted)" }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Blogger 風アーカイブサイドバー ─── */
function ArchiveSidebar({
  allDates,
  activeMonth,
  activeType,
}: {
  allDates: string[];
  activeMonth?: string;
  activeType?: string;
}) {
  const tree = useMemo(() => buildArchiveTree(allDates), [allDates]);
  /* 開閉状態: "2026" や "2026-02" をキーとして管理 */
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    /* 最初の年だけ開いた状態にする */
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

  function buildMonthHref(monthKey: string) {
    const params = new URLSearchParams();
    if (activeType) params.set("type", activeType);
    if (activeMonth !== monthKey) params.set("month", monthKey);
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
    <aside
      className="timeline-sidebar"
      style={{
        width: 180,
        paddingTop: "var(--space-2)",
        position: "sticky",
        top: "var(--space-7)",
        alignSelf: "flex-start",
      }}
    >
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
                gap: 6,
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
              <div style={{ paddingLeft: 14, marginTop: "var(--space-1)" }}>
                {yearNode.months.map((monthNode) => {
                  const monthOpen = openKeys.has(monthNode.key);
                  const isActive = activeMonth === monthNode.key;
                  return (
                    <div key={monthNode.key} style={{ marginBottom: "var(--space-1)" }}>
                      {/* 月ラベル: ▶ はトグル、月名はフィルタリンク */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>
                        <button
                          type="button"
                          onClick={() => toggle(monthNode.key)}
                          style={{ ...btnStyle, display: "inline-flex", alignItems: "center" }}
                        >
                          <ToggleArrow open={monthOpen} />
                        </button>
                        <Link
                          href={buildMonthHref(monthNode.key)}
                          className={`${isActive ? "underline-active" : ""} action-link`.trim()}
                          style={{
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "var(--fg)" : "var(--muted)",
                          }}
                        >
                          {Number(monthNode.month)}月
                        </Link>
                        <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                          ({monthNode.count})
                        </span>
                      </div>

                      {/* 日付一覧 */}
                      {monthOpen ? (
                        <div style={{ paddingLeft: 14, marginTop: 2 }}>
                          {monthNode.dates.map((d) => (
                            <div
                              key={d}
                              style={{
                                fontSize: "var(--font-meta)",
                                lineHeight: "var(--lh-normal)",
                                color: "var(--muted)",
                              }}
                            >
                              {d}
                            </div>
                          ))}
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
    </aside>
  );
}

/* ─── モバイル用インラインアーカイブ（簡易版） ─── */
function MobileArchive({
  allDates,
  activeMonth,
  activeType,
}: {
  allDates: string[];
  activeMonth?: string;
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

/* ─── メインビュー ─── */
export function TimelineView({
  items,
  activeType,
  activeMonth,
  availableMonths,
  allDates,
}: {
  items: TimelineItem[];
  activeType?: string;
  activeMonth?: string;
  availableMonths: string[];
  allDates: string[];
}) {
  const groups = groupByDate(items);

  return (
    <div style={{ marginTop: "var(--space-11)" }}>
      {/* メインレイアウト: コンテンツ + サイドバー */}
      <div className="timeline-layout" style={{ display: "flex", gap: "var(--space-10)" }}>
        {/* コンテンツ（中央配置） */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0 }}>
          <div style={{ width: "min(100%, 640px)" }}>
            {/* フィルタ行 + モバイルアーカイブ */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", marginBottom: "var(--space-9)" }}>
              <FilterTabs activeType={activeType} activeMonth={activeMonth} />
              <MobileArchive allDates={allDates} activeMonth={activeMonth} activeType={activeType} />
            </div>
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
        </div>

        {/* サイドバー（デスクトップのみ、CSSで制御） */}
        <ArchiveSidebar allDates={allDates} activeMonth={activeMonth} activeType={activeType} />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TimelineItem } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";
import { Header } from "@/components/Header";

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
  /* Map/Set で O(1) ルックアップに最適化（js-set-map-lookups） */
  const yearMap = new Map<string, ArchiveYear>();
  const monthMap = new Map<string, ArchiveMonth>();
  const dateSet = new Map<string, Set<string>>();

  for (const d of dates) {
    const [y, m] = d.split(".");

    let yearNode = yearMap.get(y);
    if (!yearNode) {
      yearNode = { year: y, count: 0, months: [] };
      yearMap.set(y, yearNode);
      tree.push(yearNode);
    }
    yearNode.count++;

    const key = `${y}-${m}`;
    let monthNode = monthMap.get(key);
    if (!monthNode) {
      monthNode = { month: m, key, count: 0, dates: [] };
      monthMap.set(key, monthNode);
      yearNode.months.push(monthNode);
      dateSet.set(key, new Set());
    }
    monthNode.count++;

    const seen = dateSet.get(key)!;
    if (!seen.has(d)) {
      seen.add(d);
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
/* ─── 画像ライトボックス（Twitter風） ─── */
type ImageItem = NonNullable<TimelineItem["images"]>[number];

function PhotoLightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: ImageItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const img = images[index];
  const hasMultiple = images.length > 1;

  /* キーボード操作 */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMultiple) onPrev();
      if (e.key === "ArrowRight" && hasMultiple) onNext();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, hasMultiple]);

  return (
    <div className="tl-lightbox" onClick={onClose} role="dialog" aria-label="画像を拡大表示">
      {/* 閉じるボタン */}
      <button type="button" className="tl-lightbox-close" onClick={onClose} aria-label="閉じる">
        ×
      </button>

      {/* 画像 */}
      <div className="tl-lightbox-img" onClick={(e) => e.stopPropagation()}>
        <Image
          src={img.src}
          alt={img.alt}
          width={img.width}
          height={img.height}
          sizes="90vw"
          priority
          style={{ objectFit: "contain", maxWidth: "90vw", maxHeight: "90vh", width: "auto", height: "auto" }}
        />
      </div>

      {/* ナビゲーション矢印 */}
      {hasMultiple && (
        <>
          <button
            type="button"
            className="tl-lightbox-nav tl-lightbox-nav--prev"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            aria-label="前の画像"
          >
            ‹
          </button>
          <button
            type="button"
            className="tl-lightbox-nav tl-lightbox-nav--next"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            aria-label="次の画像"
          >
            ›
          </button>
        </>
      )}

      {/* カウンター */}
      {hasMultiple && (
        <div className="tl-lightbox-counter">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

/* ─── Twitter風 複数画像グリッド ─── */
function TimelineImageGrid({ images }: { images: ImageItem[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((idx: number) => setLightboxIndex(idx), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);
  const nextImage = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  if (!images || images.length === 0) return null;

  const count = images.length;
  const maxShow = 4;
  const visible = images.slice(0, maxShow);
  const extra = count - maxShow;

  /* クリック可能な画像セル */
  function Cell({ img, idx, className }: { img: ImageItem; idx: number; className?: string }) {
    return (
      <button
        type="button"
        className={`tl-photo-cell ${className ?? ""}`.trim()}
        onClick={() => openLightbox(idx)}
        aria-label={`画像${idx + 1}を拡大`}
      >
        <Image src={img.src} alt={img.alt} fill loading="lazy"
          sizes="(max-width: 900px) 90vw, 500px"
          placeholder="blur" blurDataURL={blurDataURL(img.width, img.height)}
          style={{ objectFit: "cover" }} />
      </button>
    );
  }

  const grid = (() => {
    if (count === 1) {
      return (
        <div className="tl-photo-grid tl-photo-grid--1">
          <Cell img={visible[0]} idx={0} />
        </div>
      );
    }
    if (count === 2) {
      return (
        <div className="tl-photo-grid tl-photo-grid--2">
          {visible.map((img, i) => <Cell key={i} img={img} idx={i} />)}
        </div>
      );
    }
    if (count === 3) {
      return (
        <div className="tl-photo-grid tl-photo-grid--3">
          <Cell img={visible[0]} idx={0} className="tl-photo-cell--main" />
          <div className="tl-photo-side">
            {visible.slice(1).map((img, i) => <Cell key={i} img={img} idx={i + 1} />)}
          </div>
        </div>
      );
    }
    return (
      <div className="tl-photo-grid tl-photo-grid--4">
        {visible.map((img, i) => (
          <div key={i} style={{ position: "relative" }}>
            <Cell img={img} idx={i} />
            {i === 3 && extra > 0 && (
              <span className="tl-photo-extra">+{extra}</span>
            )}
          </div>
        ))}
      </div>
    );
  })();

  return (
    <>
      {grid}
      {lightboxIndex !== null && (
        <PhotoLightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </>
  );
}

/* ─── 個別の投稿カード ─── */
function TimelinePost({ item }: { item: TimelineItem }) {
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

/* ─── フィルタタブ ─── */
function FilterTabs({
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
  function buildTagHref(tag?: string) {
    const params = new URLSearchParams();
    /* トグル動作: 同じタグなら解除、別タグなら切替 */
    if (tag && activeTag !== tag) params.set("tag", tag);
    if (activeMonth) params.set("month", activeMonth);
    if (activeDate) params.set("date", activeDate);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  return (
    <nav className="timeline-filter-tabs">
      <Link
        href={buildTagHref()}
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
            href={buildTagHref(tag)}
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

/* ─── Blogger 風アーカイブサイドバー ─── */
function ArchiveSidebar({
  allDates,
  activeMonth,
  activeDate,
}: {
  allDates: string[];
  activeMonth?: string;
  activeDate?: string;
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
    if (activeMonth !== monthKey) params.set("month", monthKey);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  /* 日付リンク: クリックでその日だけ表示（トグル動作） */
  function buildDateHref(date: string) {
    const params = new URLSearchParams();
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
              aria-expanded={yearOpen}
              aria-label={`${yearNode.year}年のアーカイブ`}
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
                          aria-expanded={monthOpen}
                          aria-label={`${Number(monthNode.month)}月のアーカイブ`}
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
                        <div style={{ paddingLeft: 16, marginTop: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          {monthNode.dates.map((d) => {
                            const isDateActive = activeDate === d;
                            return (
                              <Link
                                key={d}
                                href={buildDateHref(d)}
                                className={`${isDateActive ? "underline-active" : ""} action-link`.trim()}
                                style={{
                                  display: "inline-block",
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

/* ─── モバイル用ボトムドロワーアーカイブ ─── */
function MobileArchiveDrawer({
  allDates,
  activeMonth,
  activeDate,
  open,
  onClose,
}: {
  allDates: string[];
  activeMonth?: string;
  activeDate?: string;
  open: boolean;
  onClose: () => void;
}) {
  const tree = useMemo(() => buildArchiveTree(allDates), [allDates]);
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

  function buildMonthHref(monthKey: string) {
    const params = new URLSearchParams();
    if (activeMonth !== monthKey) params.set("month", monthKey);
    const qs = params.toString();
    return qs ? `/timeline?${qs}` : "/timeline";
  }

  function buildDateHref(date: string) {
    const params = new URLSearchParams();
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

  if (!open) return null;

  return (
    <>
      {/* バックドロップ */}
      <div className="mobile-archive-drawer-backdrop" onClick={onClose} />

      {/* ドロワー本体 */}
      <div className="mobile-archive-drawer">
        <div className="mobile-archive-drawer-header">
          <span style={{ fontSize: "var(--font-heading)", fontWeight: 700 }}>Archive</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnStyle,
              fontSize: "var(--font-body)",
              lineHeight: 1,
              color: "var(--muted)",
            }}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {tree.map((yearNode) => {
          const yearOpen = openKeys.has(yearNode.year);
          return (
            <div key={yearNode.year} style={{ marginBottom: "var(--space-3)" }}>
              <button
                type="button"
                onClick={() => toggle(yearNode.year)}
                aria-expanded={yearOpen}
                aria-label={`${yearNode.year}年のアーカイブ`}
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

              {yearOpen ? (
                <div style={{ paddingLeft: 16, marginTop: "var(--space-1)" }}>
                  {yearNode.months.map((monthNode) => {
                    const monthOpen = openKeys.has(monthNode.key);
                    const isMonthActive = activeMonth === monthNode.key;
                    return (
                      <div key={monthNode.key} style={{ marginBottom: "var(--space-1)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>
                          <button
                            type="button"
                            onClick={() => toggle(monthNode.key)}
                            aria-expanded={monthOpen}
                            aria-label={`${Number(monthNode.month)}月のアーカイブ`}
                            style={{ ...btnStyle, display: "inline-flex", alignItems: "center" }}
                          >
                            <ToggleArrow open={monthOpen} />
                          </button>
                          <Link
                            href={buildMonthHref(monthNode.key)}
                            className={`${isMonthActive ? "underline-active" : ""} action-link`.trim()}
                            onClick={onClose}
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

                        {monthOpen ? (
                          <div style={{ paddingLeft: 16, marginTop: 0 }}>
                            {monthNode.dates.map((d) => {
                              const isDateActive = activeDate === d;
                              return (
                                <Link
                                  key={d}
                                  href={buildDateHref(d)}
                                  className={`${isDateActive ? "underline-active" : ""} action-link`.trim()}
                                  onClick={onClose}
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
    </>
  );
}

/* ─── アクティブフィルタ表示 ─── */
function ActiveFilter({ activeDate, activeMonth, activeTag }: { activeDate?: string; activeMonth?: string; activeTag?: string }) {
  if (!activeDate && !activeMonth && !activeTag) return null;

  const parts: string[] = [];
  if (activeTag) parts.push(`#${activeTag}`);
  if (activeDate) parts.push(activeDate);
  else if (activeMonth) parts.push(`${activeMonth.replace("-", "年")}月`);
  const label = parts.join(" / ");

  const clearHref = "/timeline";

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
  activeMonth,
  activeDate,
  activeTag,
  availableMonths,
  availableTags,
  allDates,
}: {
  items: TimelineItem[];
  activeMonth?: string;
  activeDate?: string;
  activeTag?: string;
  availableMonths: string[];
  availableTags: string[];
  allDates: string[];
}) {
  const groups = groupByDate(items);

  return (
    <div className="timeline-layout" style={{ marginTop: "var(--space-6)" }}>
      {/* フィルタタブ */}
      <div className="timeline-filter-tabs-wrap">
        <FilterTabs activeMonth={activeMonth} activeDate={activeDate} activeTag={activeTag} availableTags={availableTags} />
      </div>

      {/* サイドバー（デスクトップのみ、フィルタタブと同じ行から開始） */}
      <ArchiveSidebar allDates={allDates} activeMonth={activeMonth} activeDate={activeDate} />

      {/* コンテンツ */}
      <div className="timeline-content">
          <ActiveFilter activeDate={activeDate} activeMonth={activeMonth} activeTag={activeTag} />
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
  );
}

/* ─── ページラッパー: Header + TimelineView + ドロワーを統合 ─── */
export function TimelinePageContent({
  items,
  activeMonth,
  activeDate,
  activeTag,
  availableMonths,
  availableTags,
  allDates,
}: {
  items: TimelineItem[];
  activeMonth?: string;
  activeDate?: string;
  activeTag?: string;
  availableMonths: string[];
  availableTags: string[];
  allDates: string[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const archiveButton = (
    <button
      type="button"
      className="mobile-archive-trigger"
      onClick={() => setDrawerOpen(true)}
    >
      Archive +
    </button>
  );

  return (
    <>
      <Header
        active="Time Line"
        title="Time Line"
        showCategoryRow={false}
        titleRight={archiveButton}
      />
      <TimelineView
        items={items}
        activeMonth={activeMonth}
        activeDate={activeDate}
        activeTag={activeTag}
        availableMonths={availableMonths}
        availableTags={availableTags}
        allDates={allDates}
      />
      <MobileArchiveDrawer
        allDates={allDates}
        activeMonth={activeMonth}
        activeDate={activeDate}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import type { TimelineItem } from "@/lib/types";
import { groupByDate } from "@/lib/timeline-utils";
import { Header } from "@/components/Header";
import { FilterTabs, ActiveFilter } from "@/components/timeline/TimelineHeader";
import { ArchiveSidebar, MobileArchiveDrawer } from "@/components/timeline/TimelineMonth";
import { TimelinePost } from "@/components/timeline/TimelinePost";

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
    <div className="timeline-layout">
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
        showTitleRow={false}
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

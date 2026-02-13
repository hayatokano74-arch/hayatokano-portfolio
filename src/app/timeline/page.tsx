import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Time Line" };
import { TimelineView } from "@/components/TimelineView";
import { getTimeline } from "@/lib/timeline";

/* 日付文字列 → 月キー "2026-02" */
function monthKey(date: string) {
  const d = date.split(" ")[0];
  const [y, m] = d.split(".");
  return `${y}-${m}`;
}

/* 日付文字列 → 日付部分 "2026.02.09" */
function dateOnly(date: string) {
  return date.split(" ")[0];
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; month?: string; date?: string; q?: string; tag?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const activeType = sp?.type === "photo" || sp?.type === "text" ? sp.type : undefined;
  const activeMonth = sp?.month;
  const activeDate = sp?.date;
  const activeTag = sp?.tag;
  const q = sp?.q?.toLowerCase() ?? "";
  const timeline = await getTimeline();

  /* 全投稿から利用可能な月一覧を取得（重複排除） */
  const availableMonths = [...new Set(timeline.map((item) => monthKey(item.date)))];

  /* アーカイブ用: 全投稿の日付一覧（重複排除） */
  const allDates = [...new Set(timeline.map((item) => dateOnly(item.date)))];

  /* 全投稿から利用可能なタグ一覧を取得（重複排除） */
  const availableTags = [...new Set(timeline.flatMap((item) => item.tags ?? []))];

  /* フィルタリング */
  let filtered = timeline;
  if (activeType) {
    filtered = filtered.filter((item) => item.type === activeType);
  }
  if (activeTag) {
    filtered = filtered.filter((item) => item.tags?.includes(activeTag));
  }
  if (activeDate) {
    /* 特定の日付でフィルタ（月フィルタより優先） */
    filtered = filtered.filter((item) => dateOnly(item.date) === activeDate);
  } else if (activeMonth) {
    filtered = filtered.filter((item) => monthKey(item.date) === activeMonth);
  }
  if (q) {
    filtered = filtered.filter((item) => item.text.toLowerCase().includes(q));
  }

  return (
    <CanvasShell>
      <Header active="Time Line" title="Time Line" showCategoryRow={false} />
      <TimelineView
        items={filtered}
        activeType={activeType}
        activeMonth={activeMonth}
        activeDate={activeDate}
        activeTag={activeTag}
        availableMonths={availableMonths}
        availableTags={availableTags}
        allDates={allDates}
      />
    </CanvasShell>
  );
}

import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Time Line" };
import { TimelineView } from "@/components/TimelineView";
import { timeline } from "@/lib/mock";

/* 日付文字列 → 月キー "2026-02" */
function monthKey(date: string) {
  const d = date.split(" ")[0];
  const [y, m] = d.split(".");
  return `${y}-${m}`;
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; month?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const activeType = sp?.type === "photo" || sp?.type === "text" ? sp.type : undefined;
  const activeMonth = sp?.month;
  const q = sp?.q?.toLowerCase() ?? "";

  /* 全投稿から利用可能な月一覧を取得（重複排除） */
  const availableMonths = [...new Set(timeline.map((item) => monthKey(item.date)))];

  /* アーカイブ用: 全投稿の日付一覧（重複排除） */
  const allDates = [...new Set(timeline.map((item) => item.date.split(" ")[0]))];

  /* フィルタリング */
  let filtered = timeline;
  if (activeType) {
    filtered = filtered.filter((item) => item.type === activeType);
  }
  if (activeMonth) {
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
        availableMonths={availableMonths}
        allDates={allDates}
      />
    </CanvasShell>
  );
}

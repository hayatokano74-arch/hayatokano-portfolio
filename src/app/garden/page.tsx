import { Suspense } from "react";
import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenPageContent } from "@/components/GardenPageContent";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

/* 60秒ごとに Dropbox から最新データを再取得 */
export const revalidate = 60;

export default async function GardenPage() {
  let nodes: Awaited<ReturnType<typeof getAllNodes>> = [];
  try {
    nodes = await getAllNodes();
  } catch {
    // Dropbox 接続エラー時は空で表示
  }

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <Suspense>
        <GardenPageContent nodes={nodes} />
      </Suspense>
    </CanvasShell>
  );
}

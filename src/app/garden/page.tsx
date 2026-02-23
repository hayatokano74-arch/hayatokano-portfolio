import { Suspense } from "react";
import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenPageContent } from "@/components/GardenPageContent";
import { getAllNodes } from "@/lib/garden/reader";
import type { GardenNode } from "@/lib/garden/types";

export const metadata: Metadata = { title: "Garden" };

/* サーバーレス関数の最大実行時間（秒）— 1078+ファイルの Dropbox ダウンロードに必要 */
export const maxDuration = 60;

/* 5分ごとに Dropbox から最新データを再取得 */
export const revalidate = 300;

export default async function GardenPage() {
  let nodes: GardenNode[] = [];
  let error: string | null = null;
  try {
    nodes = await getAllNodes();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error("[Garden] getAllNodes failed:", error);
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

import { Suspense } from "react";
import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenPageContent } from "@/components/GardenPageContent";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

/* サーバーレス関数の最大実行時間 */
export const maxDuration = 60;

/**
 * Garden ページ（Server Component）
 *
 * データは prebuild で生成されたキャッシュファイル（.garden-cache.json）から読む。
 * ランタイムで Dropbox API は呼ばない。
 * コンテンツ更新は再ビルド（git push / Deploy Hook）で反映される。
 */
export default async function GardenPage() {
  const nodes = await getAllNodes();

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <Suspense>
        <GardenPageContent nodes={nodes} />
      </Suspense>
    </CanvasShell>
  );
}

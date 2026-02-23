import { Suspense } from "react";
import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenPageContent } from "@/components/GardenPageContent";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

/* サーバーレス関数の最大実行時間（秒）— 1078+ファイルの Dropbox ダウンロードに必要 */
export const maxDuration = 60;

/* 1時間ごとに Dropbox から最新データを再取得（429 防止） */
export const revalidate = 3600;

/**
 * Garden ページ（Server Component）
 *
 * Dropbox API 失敗時はエラーを投げる（try-catch しない）。
 * これにより Next.js ISR が前回成功したキャッシュページを配信する。
 * エラーをキャッチして空配列で描画すると ISR が空ページをキャッシュしてしまう。
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

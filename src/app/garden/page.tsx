import { Suspense } from "react";
import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { GardenPageContent } from "@/components/GardenPageContent";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

/* ISR: CDNキャッシュを1時間保持（ノードキャッシュ使用時は処理が瞬時） */
export const revalidate = 3600;

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
      <Suspense>
        <GardenPageContent nodes={nodes} />
      </Suspense>
    </CanvasShell>
  );
}

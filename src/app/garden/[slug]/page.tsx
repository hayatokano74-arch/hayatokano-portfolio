import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { GardenDetailPageClient } from "@/components/GardenDetailPageClient";
import { getAllPageSlugs } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

/* ビルド時に既知のスラッグのHTMLを事前生成（SEO用）。新規スラッグはSSRで対応 */
export const dynamicParams = true;
export async function generateStaticParams() {
  try {
    const slugs = await getAllPageSlugs();
    const params = slugs.map((slug) => ({ slug }));
    // フォールバック用プレースホルダー（.htaccessで未知のスラッグをここにリライト）
    params.push({ slug: "_placeholder" });
    return params;
  } catch {
    return [{ slug: "_placeholder" }];
  }
}

export default function GardenDetailPage() {
  return (
    <CanvasShell>
      <GardenDetailPageClient />
    </CanvasShell>
  );
}

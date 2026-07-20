import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { GardenDetailPageClient } from "@/components/GardenDetailPageClient";
import { getAllPageSlugs } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

/*
 * ビルド時に既知のスラッグのHTMLを事前生成（SEO用・パフォーマンス向上）。
 * dynamicParams=true にしているので、ここに無いスラッグ（ビルド後にCMSで
 * 追加されたエントリ）へのアクセスもオンデマンドで描画され、404にならない。
 */
export const dynamicParams = true;
export async function generateStaticParams() {
  try {
    const [fileSlugs, cmsSlugs] = await Promise.all([
      getAllPageSlugs(),
      getCmsGardenSlugs(),
    ]);
    const slugs = new Set([...fileSlugs, ...cmsSlugs]);
    const params = [...slugs].map((slug) => ({ slug }));
    // フォールバック用プレースホルダー（.htaccessで未知のスラッグをここにリライト）
    params.push({ slug: "_placeholder" });
    return params;
  } catch {
    return [{ slug: "_placeholder" }];
  }
}

/** CMS(media.hayatokano.com)から現在のGardenスラッグ一覧を取得する */
async function getCmsGardenSlugs(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_CMS_API_URL ?? "https://media.hayatokano.com/_cms/api";
  try {
    const res = await fetch(`${base}/garden.php?all=1`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const items: { slug: string }[] = await res.json();
    return items.map((item) => item.slug);
  } catch {
    return [];
  }
}

export default function GardenDetailPage() {
  return (
    <CanvasShell>
      <GardenDetailPageClient />
    </CanvasShell>
  );
}

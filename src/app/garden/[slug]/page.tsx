import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { GardenDetailPageClient } from "@/components/GardenDetailPageClient";
import { getAllPageSlugs } from "@/lib/garden/reader";

export const metadata: Metadata = { title: "Garden" };

/* ビルド時に既知のスラッグのHTMLを生成（SEO用） */
export const dynamicParams = false;
export async function generateStaticParams() {
  try {
    const slugs = await getAllPageSlugs();
    return slugs.map((slug) => ({ slug }));
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

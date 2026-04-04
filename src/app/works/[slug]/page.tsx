import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorkDetailPageClient } from "@/components/WorkDetailPageClient";
import { getWorks } from "@/lib/works";

export const metadata: Metadata = { title: "Works" };

/* ビルド時に既知のスラッグのHTMLを生成（SEO用） */
export const dynamicParams = false;
export async function generateStaticParams() {
  try {
    const works = await getWorks();
    return works.map((w) => ({ slug: w.slug }));
  } catch {
    return [];
  }
}

export default function WorkDetailPage() {
  return (
    <CanvasShell>
      <WorkDetailPageClient />
    </CanvasShell>
  );
}

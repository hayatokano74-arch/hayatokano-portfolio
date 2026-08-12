import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorksPageClient } from "@/components/WorksPageClient";
import { getWorks } from "@/lib/works";

// CMS更新時に /api/revalidate を叩くことで即時反映（メイン経路）
// 1時間キャッシュはWebhook失敗時の保険（以前は24時間で影響が長引いていた）
export const revalidate = 3600;

const BASE_URL = "https://hayatokano.com";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const works = await getWorks();
    const latest = works[0];
    const image = latest?.thumbnail?.src || latest?.media[0]?.src;
    const imageUrl = image?.startsWith("http") ? image : image ? `${BASE_URL}${image}` : undefined;
    return {
      title: "Works",
      openGraph: {
        title: "Works | Hayato Kano",
        ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
      },
    };
  } catch {
    return { title: "Works" };
  }
}

export default async function WorksPage() {
  const works = await getWorks();
  return (
    <CanvasShell>
      <WorksPageClient works={works} />
    </CanvasShell>
  );
}

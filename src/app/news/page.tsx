import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { NewsPageClient } from "@/components/NewsPageClient";
import { getNews } from "@/lib/news";

// CMS更新時に /api/revalidate を叩くことで即時反映（メイン経路）
// 1時間キャッシュはWebhook失敗時の保険
export const revalidate = 3600;

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const news = await getNews();
  return (
    <CanvasShell>
      <NewsPageClient news={news} />
    </CanvasShell>
  );
}

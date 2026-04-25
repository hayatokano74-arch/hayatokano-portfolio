import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { NewsPageClient } from "@/components/NewsPageClient";
import { getNews } from "@/lib/news";

// 更新頻度が低いため24時間キャッシュ（手動revalidateで即時反映可能）
export const revalidate = 86400;

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const news = await getNews();
  return (
    <CanvasShell>
      <NewsPageClient news={news} />
    </CanvasShell>
  );
}

import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { NewsPageClient } from "@/components/NewsPageClient";
import { getNews } from "@/lib/news";

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

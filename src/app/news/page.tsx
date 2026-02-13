import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { NewsView } from "@/components/NewsView";
import { getNews } from "@/lib/news";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const news = await getNews();
  return (
    <CanvasShell>
      <Header active="News" title="News" showCategoryRow={false} />
      <NewsView items={news} />
    </CanvasShell>
  );
}

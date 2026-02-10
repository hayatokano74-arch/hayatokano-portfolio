import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { NewsView } from "@/components/NewsView";
import { news } from "@/lib/mock";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <CanvasShell>
      <Header active="News" title="News" showCategoryRow={false} />
      <NewsView items={news} />
    </CanvasShell>
  );
}

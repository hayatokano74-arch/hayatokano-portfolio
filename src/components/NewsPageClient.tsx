"use client";

import type { NewsItem } from "@/lib/types";
import { Header } from "./Header";
import { NewsView } from "./NewsView";

export function NewsPageClient({ news }: { news: NewsItem[] }) {
  return (
    <>
      <Header
        active="News"
        title={
          <>
            News
            <span className="page-title-count">({news.length})</span>
          </>
        }
        showTitleRow={false}
        showCategoryRow={false}
      />
      <NewsView items={news} />
    </>
  );
}

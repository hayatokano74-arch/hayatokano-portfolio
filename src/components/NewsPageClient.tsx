"use client";

/**
 * News 一覧ページ（クライアントサイドデータ取得版）
 * CMS API から直接 News を取得して表示する。
 */

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/types";
import { fetchNewsFromCms } from "@/lib/cms/news-client";
import { Header } from "./Header";
import { NewsView } from "./NewsView";

export function NewsPageClient() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsFromCms()
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <Header active="News" title="News" showTitleRow={false} showCategoryRow={false} />
        <div style={{ minHeight: "50vh" }} />
      </>
    );
  }

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

"use client";

/**
 * News クライアントサイドデータ取得
 * CMS API から直接取得し、NewsItem 型に正規化する。
 */

import type { NewsItem } from "@/lib/types";
import type { CmsNews } from "./client";
import { fetchCmsClient } from "./use-cms";
import { absoluteMediaSrc } from "@/lib/url-utils";

/** CMS レスポンスを NewsItem 型に正規化 */
function parseCmsNews(item: CmsNews): NewsItem | null {
  const title = item.title.trim();
  if (!item.slug || !title) return null;

  const img = item.data.image;
  return {
    id: item.data.id ? String(item.data.id) : item.slug,
    date: item.date,
    title,
    body: item.body,
    ...(img?.src
      ? { image: { src: absoluteMediaSrc(img.src), width: img.width ?? 800, height: img.height ?? 500 } }
      : {}),
  };
}

/** CMS API から全 News を取得 */
export async function fetchNewsFromCms(): Promise<NewsItem[]> {
  const items = await fetchCmsClient<CmsNews[]>("news.php");
  const news: NewsItem[] = [];
  for (const item of items) {
    const n = parseCmsNews(item);
    if (n) news.push(n);
  }
  return news;
}

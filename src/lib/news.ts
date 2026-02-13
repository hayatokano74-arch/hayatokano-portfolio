/**
 * News データ取得
 *
 * WP REST API → normalize → 型安全な NewsItem[]
 * WP_BASE_URL 未設定 or API失敗時は mock.ts のフォールバックデータを返す
 */

import { type NewsItem, news as fallbackNews } from "@/lib/mock";
import { fetchWpApi } from "@/lib/wp/client";
import type { WpNewsResponse } from "@/lib/wp/types";

function normalizeNewsItem(raw: WpNewsResponse): NewsItem | null {
  const id = (raw.id ?? "").trim();
  const title = (raw.title ?? "").trim();
  if (!id || !title) return null;

  return {
    id,
    date: (raw.date ?? "").trim(),
    title,
    body: (raw.body ?? "").trim(),
    ...(raw.image?.src
      ? {
          image: {
            src: raw.image.src,
            width: raw.image.width ?? 800,
            height: raw.image.height ?? 500,
          },
        }
      : {}),
  };
}

/** News 全件取得 */
export async function getNews(): Promise<NewsItem[]> {
  const data = await fetchWpApi<WpNewsResponse[]>("hayato/v1/news");
  if (!data || !Array.isArray(data)) return fallbackNews;

  const normalized = data
    .map(normalizeNewsItem)
    .filter((n): n is NewsItem => Boolean(n));
  return normalized.length > 0 ? normalized : fallbackNews;
}

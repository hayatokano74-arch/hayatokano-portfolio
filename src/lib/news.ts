/**
 * News データ取得
 *
 * 優先順位:
 *  1. PHP CMS API（https://hayatokano.com/_cms/api/news.php）
 *  2. content/news/*.md のローカルファイル（CMS が空 / 未到達時のフォールバック）
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { NewsItem } from "@/lib/types";
import { news as fallbackNews } from "@/lib/mock";
import { fetchCms, type CmsNews } from "@/lib/cms/client";

const NEWS_DIR = path.join(process.cwd(), "content/news");

/** CMS レスポンスを NewsItem 型に正規化 */
function parseCmsNews(item: CmsNews): NewsItem | null {
  const title = item.title.trim();
  if (!item.slug || !title) return null;

  const img = item.data.image;
  return {
    // 元の frontmatter id があれば使用、なければ slug を代用
    id: item.data.id ? String(item.data.id) : item.slug,
    date: item.date,
    title,
    body: item.body,
    ...(img?.src
      ? { image: { src: img.src, width: img.width ?? 800, height: img.height ?? 500 } }
      : {}),
  };
}

/** ローカル MD ファイルから News を読み込む（フォールバック用） */
function loadNewsFromLocal(): NewsItem[] {
  try {
    const files = fs
      .readdirSync(NEWS_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    if (files.length === 0) return [];

    const items: NewsItem[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(NEWS_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      const id = (String(data.id ?? "")).trim();
      const title = (String(data.title ?? "")).trim();
      if (!id || !title) continue;

      const img = data.image as
        | { src?: string; width?: number; height?: number }
        | undefined;
      items.push({
        id,
        date: (String(data.date ?? "")).trim(),
        title,
        body: content.trim(),
        ...(img?.src
          ? { image: { src: img.src, width: img.width ?? 800, height: img.height ?? 500 } }
          : {}),
      });
    }
    return items;
  } catch {
    return [];
  }
}

/** News 全件取得
 *  1. CMS API → 2. ローカル MD → 3. フォールバック
 */
export async function getNews(): Promise<NewsItem[]> {
  // 1. CMS API
  try {
    const items = await fetchCms<CmsNews[]>("news.php");
    if (Array.isArray(items) && items.length > 0) {
      const news: NewsItem[] = [];
      for (const item of items) {
        const n = parseCmsNews(item);
        if (n) news.push(n);
      }
      if (news.length > 0) return news;
    }
  } catch {
    // CMS 未到達時はフォールバックへ
  }

  // 2. ローカル MD ファイル
  const local = loadNewsFromLocal();
  if (local.length > 0) return local;

  // 3. フォールバック
  return fallbackNews;
}

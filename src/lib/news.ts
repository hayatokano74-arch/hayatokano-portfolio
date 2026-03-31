/**
 * News データ取得
 *
 * content/news/*.md から gray-matter でパースして返す。
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { NewsItem } from "@/lib/types";
import { news as fallbackNews } from "@/lib/mock";

const NEWS_DIR = path.join(process.cwd(), "content/news");

/** News 全件取得 */
export async function getNews(): Promise<NewsItem[]> {
  try {
    const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
    if (files.length === 0) return fallbackNews;

    const items: NewsItem[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(NEWS_DIR, file), "utf-8");
      const { data, content } = matter(raw);

      const id = (String(data.id ?? "")).trim();
      const title = (String(data.title ?? "")).trim();
      if (!id || !title) continue;

      const img = data.image as { src?: string; width?: number; height?: number } | undefined;
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

    return items.length > 0 ? items : fallbackNews;
  } catch {
    return fallbackNews;
  }
}

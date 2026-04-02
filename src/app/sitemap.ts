export const dynamic = 'force-static'

/* 動的サイトマップ生成 */

import type { MetadataRoute } from "next";
import { getAllNodes } from "@/lib/garden/reader";

const BASE_URL = "https://hayatokano.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* 固定ページ */
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "monthly", priority: 1.0 },
    { url: `${BASE_URL}/works`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/me-no-hoshi`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/text`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/news`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/garden`, changeFrequency: "daily", priority: 0.8 },
  ];

  /* Garden記事ページ */
  let gardenPages: MetadataRoute.Sitemap = [];
  try {
    const nodes = await getAllNodes();
    gardenPages = nodes.map((node) => ({
      url: `${BASE_URL}/garden/${encodeURIComponent(node.slug)}`,
      lastModified: node.date,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // ビルド時にDropbox接続不可の場合は空で続行
  }

  return [...staticPages, ...gardenPages];
}

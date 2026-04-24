"use client";

/**
 * Garden クライアントサイドデータ取得
 * CMS API から全件取得し、GardenNode 型に変換する。
 */

import type { GardenNode } from "@/lib/garden/types";

const CMS_API_BASE =
  process.env.NEXT_PUBLIC_CMS_API_URL ?? "https://media.hayatokano.com/_cms/api";

/** CMS API の Garden レスポンス1件 */
interface CmsGardenItem {
  id: number;
  slug: string;
  date: string;
  title: string;
  tags: string[];
  type: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** 本文からプレーンテキスト抜粋を生成 */
function makeExcerpt(html: string, maxLen = 120): string {
  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

/** 読了時間を推定（日本語: 約500文字/分） */
function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, "");
  return Math.max(1, Math.round(text.length / 500));
}

/** CMS API から全 Garden ノードを取得 */
export async function fetchGardenFromCms(): Promise<GardenNode[]> {
  const res = await fetch(`${CMS_API_BASE}/garden.php?all=1`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Garden API エラー: ${res.status}`);
  const items: CmsGardenItem[] = await res.json();

  return items.map((item) => ({
    slug: item.slug,
    title: item.title,
    date: item.date,
    tags: item.tags ?? [],
    contentHtml: item.body,
    excerpt: makeExcerpt(item.body),
    mtime: new Date(item.updated_at || item.created_at).getTime(),
    readingTime: estimateReadingTime(item.body),
  }));
}

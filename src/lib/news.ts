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
import { absoluteMediaSrc, normalizeMediaRelativePath } from "@/lib/url-utils";

const NEWS_DIR = path.join(process.cwd(), "content/news");

/**
 * 本文HTMLから最初の<img>を抽出し、本文からは取り除く。
 * 構造化された「画像」欄を使わず、本文に直接画像を挿入した記事向けの
 * フォールバック。Worksと同様に「左: 本文 / 右: 写真」の構成にするため、
 * 本文中に画像タグを残したままにしない。
 */
function extractLeadImage(html: string): { image?: NewsItem["image"]; body: string } {
  const match = html.match(/<img[^>]*\ssrc="([^"]+)"[^>]*>/);
  if (!match) return { body: html };

  const tag = match[0];
  const width = Number(tag.match(/\swidth="(\d+)"/)?.[1] ?? 800);
  const height = Number(tag.match(/\sheight="(\d+)"/)?.[1] ?? 500);
  const src = absoluteMediaSrc(normalizeMediaRelativePath(match[1]));

  // 画像タグを囲む空になった<p>ごと除去（無ければタグ単体を除去）
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = html
    .replace(new RegExp(`<p>\\s*${escapedTag}\\s*</p>`), "")
    .replace(tag, "")
    .trim();

  return { image: { src, width, height }, body };
}

/** CMS レスポンスを NewsItem 型に正規化 */
function parseCmsNews(item: CmsNews): NewsItem | null {
  const title = item.title.trim();
  if (!item.slug || !title) return null;

  const img = item.data.image;
  const structuredImage = img?.src
    ? { src: absoluteMediaSrc(img.src), width: img.width ?? 800, height: img.height ?? 500 }
    : undefined;

  // 構造化画像が無ければ本文埋め込み画像をフォールバックとして使う
  const { image: leadImage, body } = structuredImage
    ? { image: undefined, body: item.body }
    : extractLeadImage(item.body);

  return {
    // 元の frontmatter id があれば使用、なければ slug を代用
    id: item.data.id ? String(item.data.id) : item.slug,
    date: item.date,
    title,
    body,
    ...(structuredImage ? { image: structuredImage } : leadImage ? { image: leadImage } : {}),
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

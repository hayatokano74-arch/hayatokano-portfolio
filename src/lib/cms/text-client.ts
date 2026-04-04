"use client";

/**
 * Text クライアントサイドデータ取得
 * CMS API から直接取得し、TextPost 型に正規化する。
 */

import type { TextPost } from "@/lib/types";
import type { CmsText } from "./client";
import { fetchCmsClient } from "./use-cms";

/** CMS レスポンスを TextPost 型に正規化 */
function parseCmsText(item: CmsText): TextPost | null {
  const title = item.title.trim();
  if (!item.slug || !title) return null;

  const categories = (item.categories ?? [])
    .map((c) => String(c).trim())
    .filter(Boolean);

  const toc = ((item.data.toc ?? []) as { id?: string; label?: string }[])
    .filter((t) => t.id && t.label)
    .map((t) => ({ id: t.id!, label: t.label! }));

  const sections = (
    (item.data.sections ?? []) as {
      id?: string;
      heading?: string;
      body?: string;
    }[]
  )
    .filter((s) => s.id && s.heading)
    .map((s) => ({
      id: s.id!,
      heading: s.heading!,
      body: (s.body ?? "").trim(),
    }));

  return {
    slug: item.slug,
    year: item.year,
    title,
    categories,
    body: item.body,
    ...(toc.length > 0 ? { toc } : {}),
    ...(sections.length > 0 ? { sections } : {}),
  };
}

/** CMS API から全 Text を取得 */
export async function fetchTextsFromCms(): Promise<TextPost[]> {
  const items = await fetchCmsClient<CmsText[]>("text.php");
  const posts: TextPost[] = [];
  for (const item of items) {
    const p = parseCmsText(item);
    if (p) posts.push(p);
  }
  return posts;
}

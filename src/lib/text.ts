/**
 * Text データ取得
 *
 * WP REST API → normalize → 型安全な TextPost[]
 * WP_BASE_URL 未設定 or API失敗時は mock.ts のフォールバックデータを返す
 */

import { cache } from "react";
import { type TextPost, texts as fallbackTexts } from "@/lib/mock";
import { fetchWpApi } from "@/lib/wp/client";
import type { WpTextResponse } from "@/lib/wp/types";

type TextCategory = string;

/** カテゴリ文字列を正規化（空文字除去のみ） */
function normalizeCategory(value: string): TextCategory | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeText(raw: WpTextResponse): TextPost | null {
  const slug = (raw.slug ?? "").trim();
  const title = (raw.title ?? "").trim();
  if (!slug || !title) return null;

  const categories = (raw.categories ?? [])
    .map(normalizeCategory)
    .filter((c): c is TextCategory => Boolean(c));

  const toc = (raw.toc ?? [])
    .filter((t) => t.id && t.label)
    .map((t) => ({ id: t.id!, label: t.label! }));

  const sections = (raw.sections ?? [])
    .filter((s) => s.id && s.heading)
    .map((s) => ({
      id: s.id!,
      heading: s.heading!,
      body: (s.body ?? "").trim(),
    }));

  return {
    slug,
    year: (raw.year ?? "").trim(),
    title,
    categories,
    body: (raw.body ?? "").trim(),
    ...(toc.length > 0 ? { toc } : {}),
    ...(sections.length > 0 ? { sections } : {}),
  };
}

/** Text 全件取得（React.cache でリクエスト単位の重複排除） */
export const getTexts = cache(async (): Promise<TextPost[]> => {
  const data = await fetchWpApi<WpTextResponse[]>("hayato/v1/text");
  if (!data || !Array.isArray(data)) return fallbackTexts;

  // WP APIが空配列を返した場合もフォールバックせず空配列を返す
  return data
    .map(normalizeText)
    .filter((t): t is TextPost => Boolean(t));
});

/** slug 指定で1件取得（React.cache でリクエスト単位の重複排除） */
export const getTextBySlug = cache(async (slug: string): Promise<TextPost | undefined> => {
  const all = await getTexts();
  return all.find((t) => t.slug === slug);
});

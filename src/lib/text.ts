/**
 * Text データ取得
 *
 * WP REST API → normalize → 型安全な TextPost[]
 * WP_BASE_URL 未設定 or API失敗時は mock.ts のフォールバックデータを返す
 */

import { type TextPost, type WorkTag, texts as fallbackTexts } from "@/lib/mock";
import { fetchWpApi } from "@/lib/wp/client";
import type { WpTextResponse } from "@/lib/wp/types";

type TextCategory = Exclude<WorkTag, "Exhibition">;

const VALID_CATEGORIES: TextCategory[] = [
  "Photography",
  "Video",
  "Personal",
  "Portrait",
];

function normalizeCategory(value: string): TextCategory | null {
  return VALID_CATEGORIES.includes(value as TextCategory)
    ? (value as TextCategory)
    : null;
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

/** Text 全件取得 */
export async function getTexts(): Promise<TextPost[]> {
  const data = await fetchWpApi<WpTextResponse[]>("hayato/v1/text");
  if (!data || !Array.isArray(data)) return fallbackTexts;

  const normalized = data
    .map(normalizeText)
    .filter((t): t is TextPost => Boolean(t));
  return normalized.length > 0 ? normalized : fallbackTexts;
}

/** slug 指定で1件取得 */
export async function getTextBySlug(
  slug: string,
): Promise<TextPost | undefined> {
  const all = await getTexts();
  return all.find((t) => t.slug === slug);
}

/**
 * Works データ取得
 *
 * WP REST API → normalize → 型安全な Work[]
 * WP_BASE_URL 未設定 or API失敗時は mock.ts のフォールバックデータを返す
 */

import { type Work, type WorkTag, works as fallbackWorks } from "@/lib/mock";
import { fetchWpApi } from "@/lib/wp/client";
import type { WpWorkResponse } from "@/lib/wp/types";

const VALID_TAGS: WorkTag[] = [
  "Photography",
  "Video",
  "Personal",
  "Portrait",
  "Exhibition",
];

function normalizeTag(value: string): WorkTag | null {
  const found = VALID_TAGS.find(
    (t) => t.toLowerCase() === value.toLowerCase(),
  );
  return found ?? null;
}

/** HTMLタグを除去してプレーンテキストにする */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function normalizeWork(raw: WpWorkResponse): Work | null {
  const slug = (raw.slug ?? "").trim();
  const title = (raw.title ?? "").trim();
  if (!slug || !title) return null;

  const tags = (raw.tags ?? [])
    .map(normalizeTag)
    .filter((t): t is WorkTag => Boolean(t));

  const media = (raw.media ?? [])
    .filter((m) => m?.id && m?.src)
    .map((m) => ({
      id: m.id!,
      type: (m.type === "video" ? "video" : "image") as "image" | "video",
      src: m.src!,
      alt: m.alt ?? "",
      width: m.width ?? 1280,
      height: m.height ?? 800,
      ...(m.poster ? { poster: m.poster } : {}),
    }));

  if (media.length === 0) return null;

  const d = raw.details ?? {};
  return {
    slug,
    date: (raw.date ?? "").trim(),
    title,
    tags: tags.length > 0 ? tags : ["Photography"],
    year: (raw.year ?? "").trim(),
    excerpt: stripHtml(raw.excerpt ?? ""),
    details: {
      artist: (d.artist ?? "").trim(),
      period: (d.period ?? "").trim(),
      venue: (d.venue ?? "").trim(),
      address: (d.address ?? "").trim(),
      access: (d.access ?? "").trim(),
      hours: (d.hours ?? "").trim(),
      closed: (d.closed ?? "").trim(),
      admission: (d.admission ?? "").trim(),
      organizer: (d.organizer ?? "").trim() || undefined,
      curator: (d.curator ?? "").trim() || undefined,
      medium: (d.medium ?? "").trim() || undefined,
      dimensions: (d.dimensions ?? "").trim() || undefined,
      edition: (d.edition ?? "").trim() || undefined,
      series: (d.series ?? "").trim() || undefined,
      publisher: (d.publisher ?? "").trim() || undefined,
      pages: (d.pages ?? "").trim() || undefined,
      binding: (d.binding ?? "").trim() || undefined,
      price: (d.price ?? "").trim() || undefined,
      credit_photo: (d.credit_photo ?? "").trim() || undefined,
      credit_design: (d.credit_design ?? "").trim() || undefined,
      credit_cooperation: (d.credit_cooperation ?? "").trim() || undefined,
      bio: (d.bio ?? "").trim() || undefined,
    },
    media,
  };
}

/** Works 全件取得 */
export async function getWorks(): Promise<Work[]> {
  const data = await fetchWpApi<WpWorkResponse[]>("hayato/v1/works");
  if (!data || !Array.isArray(data)) return fallbackWorks;

  const normalized = data
    .map(normalizeWork)
    .filter((w): w is Work => Boolean(w));
  return normalized.length > 0 ? normalized : fallbackWorks;
}

/** slug 指定で1件取得 */
export async function getWorkBySlug(slug: string): Promise<Work | undefined> {
  const all = await getWorks();
  return all.find((w) => w.slug === slug);
}

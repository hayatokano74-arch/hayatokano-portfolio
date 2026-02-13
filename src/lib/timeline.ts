/**
 * Timeline データ取得
 *
 * WP REST API → normalize → 型安全な TimelineItem[]
 * WP_BASE_URL 未設定 or API失敗時は mock.ts のフォールバックデータを返す
 */

import { type TimelineItem, timeline as fallbackTimeline } from "@/lib/mock";
import { fetchWpApi } from "@/lib/wp/client";
import type { WpTimelineResponse } from "@/lib/wp/types";

function normalizeTimelineItem(raw: WpTimelineResponse): TimelineItem | null {
  const id = (raw.id ?? "").trim();
  const date = (raw.date ?? "").trim();
  if (!id || !date) return null;

  const itemType =
    raw.type === "photo" || raw.type === "text" ? raw.type : "text";

  const images = (raw.images ?? [])
    .filter((img) => img.src)
    .map((img) => ({
      src: img.src!,
      alt: img.alt ?? "",
      width: img.width ?? 1280,
      height: img.height ?? 800,
    }));

  return {
    id,
    date,
    type: itemType,
    text: (raw.text ?? "").trim(),
    ...(images.length > 0 ? { images } : {}),
  };
}

/** Timeline 全件取得 */
export async function getTimeline(): Promise<TimelineItem[]> {
  const data = await fetchWpApi<WpTimelineResponse[]>("hayato/v1/timeline");
  if (!data || !Array.isArray(data)) return fallbackTimeline;

  const normalized = data
    .map(normalizeTimelineItem)
    .filter((t): t is TimelineItem => Boolean(t));
  return normalized.length > 0 ? normalized : fallbackTimeline;
}

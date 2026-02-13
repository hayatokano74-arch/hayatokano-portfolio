/**
 * About データ取得
 *
 * WP REST API → normalize → 型安全な About オブジェクト
 * WP_BASE_URL 未設定 or API失敗時は mock.ts のフォールバックデータを返す
 */

import { about as fallbackAbout } from "@/lib/mock";
import { fetchWpApi } from "@/lib/wp/client";
import type { WpAboutResponse } from "@/lib/wp/types";

/** About の型（mock.ts の about と同じ構造） */
export type About = {
  statement: string;
  photos: { src: string; width: number; height: number }[];
  cv: { year: string; content: string }[];
};

function normalizeAbout(raw: WpAboutResponse): About | null {
  const statement = (raw.statement ?? "").trim();
  if (!statement) return null;

  const photos = (raw.photos ?? [])
    .filter((p) => p.src)
    .map((p) => ({
      src: p.src!,
      width: p.width ?? 640,
      height: p.height ?? 420,
    }));

  const cv = (raw.cv ?? [])
    .filter((c) => c.year && c.content)
    .map((c) => ({
      year: c.year!,
      content: c.content!,
    }));

  return { statement, photos, cv };
}

/** About データ取得 */
export async function getAbout(): Promise<About> {
  const data = await fetchWpApi<WpAboutResponse>("hayato/v1/about");
  if (!data) return fallbackAbout;

  const normalized = normalizeAbout(data);
  return normalized ?? fallbackAbout;
}

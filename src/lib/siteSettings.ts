import { cache } from "react";
import { fetchWpApi } from "@/lib/wp/client";

type WpSiteSettings = {
  topHeroImageUrl?: string | null;
  /** 1ページあたりの表示数（WP管理画面で設定可能） */
  perPage?: number | null;
};

function asArray(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0),
    ),
  );
}

async function fetchWpTopHeroImageUrl() {
  const data = await fetchWpApi<WpSiteSettings>("hayato/v1/site-settings");
  return (data?.topHeroImageUrl ?? "").trim() || null;
}

/** デフォルトの1ページあたり表示数 */
const DEFAULT_PER_PAGE = 12;

/** WPのsite-settingsからperPageを取得（キャッシュ付き） */
export const getPerPage = cache(async (): Promise<number> => {
  const data = await fetchWpApi<WpSiteSettings>("hayato/v1/site-settings");
  const value = data?.perPage;
  if (typeof value === "number" && value > 0) return value;
  return DEFAULT_PER_PAGE;
});

export async function getTopHeroImageCandidates() {
  const wpTopHeroImageUrl = await fetchWpTopHeroImageUrl();
  return asArray([
    wpTopHeroImageUrl,
    process.env.TOP_HERO_IMAGE_URL,
    process.env.NEXT_PUBLIC_TOP_HERO_IMAGE_URL,
    "/images/top-hero.jpg",
    "/images/top-hero.jpeg",
    "/images/top-hero.png",
    "/images/top-hero.webp",
  ]);
}

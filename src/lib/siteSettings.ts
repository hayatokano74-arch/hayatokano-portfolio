import { cache } from "react";

/** 1ページあたりのデフォルト表示数 */
const DEFAULT_PER_PAGE = 12;

/** 1ページあたりの表示数を返す（定数） */
export const getPerPage = cache(async (): Promise<number> => DEFAULT_PER_PAGE);

/** トップページ hero 画像の候補 URL リストを返す */
export async function getTopHeroImageCandidates(): Promise<string[]> {
  const candidates = [
    process.env.TOP_HERO_IMAGE_URL,
    process.env.NEXT_PUBLIC_TOP_HERO_IMAGE_URL,
    "/images/top-hero.jpg",
    "/images/top-hero.jpeg",
    "/images/top-hero.png",
    "/images/top-hero.webp",
  ];
  return [...new Set(candidates.filter((v): v is string => typeof v === "string" && v.trim().length > 0))];
}

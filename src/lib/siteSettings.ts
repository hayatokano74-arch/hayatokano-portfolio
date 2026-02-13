import { fetchWpApi } from "@/lib/wp/client";

type WpSiteSettings = {
  topHeroImageUrl?: string | null;
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

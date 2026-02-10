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
  const base =
    (process.env.WP_BASE_URL ?? "").trim() ||
    (process.env.NEXT_PUBLIC_WP_BASE_URL ?? "").trim();
  if (!base) return null;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/wp-json/hayato/v1/site-settings`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as WpSiteSettings;
    return (data.topHeroImageUrl ?? "").trim() || null;
  } catch {
    return null;
  }
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

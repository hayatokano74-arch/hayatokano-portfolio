import { TopHero } from "@/components/TopHero";
import { getTopHeroImageCandidates } from "@/lib/siteSettings";
import { works } from "@/lib/mock";

/* 最新の Works をトップページに渡す */
const latestWorks = works.slice(0, 8).map((w) => ({
  title: w.title,
  year: w.year,
  href: `/works/${w.slug}`,
  image: w.media[0]?.src ?? null,
}));

export default async function Home() {
  const candidates = await getTopHeroImageCandidates();
  return <TopHero candidates={candidates} latestWorks={latestWorks} />;
}

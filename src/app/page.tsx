import { TopHero } from "@/components/TopHero";
import { getTopHeroImageCandidates } from "@/lib/siteSettings";
import { getWorks } from "@/lib/works";

export default async function Home() {
  const [candidates, works] = await Promise.all([
    getTopHeroImageCandidates(),
    getWorks(),
  ]);

  /* 最新の Works をトップページに渡す */
  const latestWorks = works.slice(0, 8).map((w) => ({
    title: w.title,
    year: w.year,
    href: `/works/${w.slug}`,
    image: w.thumbnail?.src ?? w.media[0]?.src ?? null,
  }));

  return <TopHero candidates={candidates} latestWorks={latestWorks} />;
}

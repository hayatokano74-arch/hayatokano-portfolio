import { TopHero } from "@/components/TopHero";
import { getTopHeroImageCandidates } from "@/lib/siteSettings";

export default async function Home() {
  const candidates = await getTopHeroImageCandidates();
  return <TopHero candidates={candidates} />;
}

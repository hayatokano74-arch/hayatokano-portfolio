import { TopHero } from "@/components/TopHero";
import { getWorks } from "@/lib/works";
import { getMeNoHoshiPosts } from "@/lib/meNoHoshi";
import { getAllNodes } from "@/lib/garden/reader";

/** HTML文字列から最初の <img> の src を抽出 */
function firstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match?.[1] ?? null;
}

export default async function Home() {
  const [works, mnhPosts, gardenNodes] = await Promise.all([
    getWorks(),
    getMeNoHoshiPosts(),
    getAllNodes(),
  ]);

  /* Garden: 画像を含む最新の投稿から1枚目を取得 */
  const gardenImage =
    gardenNodes
      .map((n) => firstImageSrc(n.contentHtml))
      .find((src) => src !== null) ?? null;

  /* 各セクションの代表画像（ホバー用） */
  const navImages: Record<string, string | null> = {
    "/works": works[0]?.thumbnail?.src ?? works[0]?.media[0]?.src ?? null,
    "/me-no-hoshi": mnhPosts[0]?.media[0]?.src ?? null,
    "/garden": gardenImage,
  };

  return <TopHero navImages={navImages} />;
}

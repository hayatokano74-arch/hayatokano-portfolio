import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { MeNoHoshiDetail } from "@/components/MeNoHoshiDetail";
import { getMeNoHoshiPosts, getMeNoHoshiBySlug } from "@/lib/meNoHoshi";

export async function generateStaticParams() {
  const posts = await getMeNoHoshiPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  /* React.cache() により getMeNoHoshiPosts の重複リクエストを排除 */
  const post = await getMeNoHoshiBySlug(slug);
  if (!post) return {};
  /* description は HTML タグを除去してプレーンテキストに */
  const description = post.statement.replace(/<[^>]+>/g, "").trim();
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      /* images は opengraph-image.tsx が自動生成するため省略 */
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      /* images は opengraph-image.tsx が自動生成するため省略 */
    },
  };
}

export default async function MeNoHoshiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getMeNoHoshiBySlug(slug);
  if (!post) return notFound();

  return (
    <CanvasShell>
      <Header
        active="目の星"
        title={post.title}
        brandLabel="目の星"
        brandHref="/me-no-hoshi"
        showCategoryRow={false}
      />
      <MeNoHoshiDetail post={post} />
    </CanvasShell>
  );
}

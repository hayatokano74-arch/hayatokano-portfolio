import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { MeNoHoshiDetail } from "@/components/MeNoHoshiDetail";
import { getMeNoHoshiPosts } from "@/lib/meNoHoshi";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getMeNoHoshiPosts();
  const post = posts.find((item) => item.slug === slug);
  if (!post) return {};
  const hero = post.media[0];
  return {
    title: post.title,
    description: post.statement,
    openGraph: {
      title: post.title,
      description: post.statement,
      ...(hero?.src ? { images: [{ url: hero.src }] } : {}),
    },
  };
}

export default async function MeNoHoshiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const posts = await getMeNoHoshiPosts();
  const post = posts.find((item) => item.slug === slug);
  if (!post) return notFound();

  return (
    <CanvasShell>
      <Header
        active="目の星"
        title="目の星"
        brandLabel="目の星"
        brandHref="/me-no-hoshi"
        showTitleRow={false}
        showCategoryRow={false}
      />
      <MeNoHoshiDetail post={post} />
    </CanvasShell>
  );
}

import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { MeNoHoshiDetailPageClient } from "@/components/MeNoHoshiDetailPageClient";
import { getMeNoHoshiPosts, getMeNoHoshiBySlug } from "@/lib/meNoHoshi";

export const dynamicParams = false;
export async function generateStaticParams() {
  try {
    const posts = await getMeNoHoshiPosts();
    const params = posts.map((p) => ({ slug: p.slug }));
    params.push({ slug: "_placeholder" });
    return params;
  } catch {
    return [{ slug: "_placeholder" }];
  }
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
      type: "article",
      title: post.title,
      description,
      url: `https://hayatokano.com/me-no-hoshi/${slug}`,
      siteName: "Hayato Kano",
      locale: "ja_JP",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

export default function MeNoHoshiDetailPage() {
  return (
    <CanvasShell>
      <MeNoHoshiDetailPageClient />
    </CanvasShell>
  );
}

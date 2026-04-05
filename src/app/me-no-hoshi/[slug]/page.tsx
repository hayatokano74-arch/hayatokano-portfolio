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
  if (slug === "_placeholder") return { title: "目の星" };
  const post = await getMeNoHoshiBySlug(slug);
  if (!post) return { title: "目の星" };
  const description = post.statement.replace(/<[^>]+>/g, "").trim().slice(0, 160);
  const image = post.media[0]?.src;
  const imageUrl = image?.startsWith("http") ? image : image ? `https://hayatokano.com${image}` : undefined;
  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `https://hayatokano.com/me-no-hoshi/${slug}`,
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
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

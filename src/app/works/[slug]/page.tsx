import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorkDetailPageClient } from "@/components/WorkDetailPageClient";
import { getWorks, getWorkBySlug } from "@/lib/works";

const BASE_URL = "https://hayatokano.com";

/* ビルド時に既知のスラッグのHTMLを生成（SEO用）。dynamicParams=trueなので未知のスラッグも404にならずオンデマンド描画される */
export const dynamicParams = true;
export async function generateStaticParams() {
  try {
    const works = await getWorks();
    const params = works.map((w) => ({ slug: w.slug }));
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
  if (slug === "_placeholder") return { title: "Works" };

  try {
    const work = await getWorkBySlug(slug);
    if (!work) return { title: "Works" };

    const title = `${work.title} | ${work.year || ""}`.replace(/\| $/, "").trim();
    const description = work.excerpt
      ? work.excerpt.replace(/<[^>]+>/g, "").trim().slice(0, 160)
      : "";
    const image = work.thumbnail?.src || work.media[0]?.src;
    const imageUrl = image?.startsWith("http") ? image : image ? `${BASE_URL}${image}` : undefined;

    return {
      title,
      description,
      openGraph: {
        type: "article",
        title,
        description,
        url: `${BASE_URL}/works/${slug}`,
        ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Works" };
  }
}

export default function WorkDetailPage() {
  return (
    <CanvasShell>
      <WorkDetailPageClient />
    </CanvasShell>
  );
}

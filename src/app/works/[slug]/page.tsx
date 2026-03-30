import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorkDetailClient } from "@/components/WorkDetailClient";
import { getWorks, getWorkBySlug } from "@/lib/works";
import { notFound } from "next/navigation";


export async function generateStaticParams() {
  const works = await getWorks();
  return works.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work) return {};
  const title = `${work.title} | ${work.year}`;
  /* HTMLタグを除去してプレーンテキストにする */
  const description = work.excerpt.replace(/<[^>]+>/g, "").trim();
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url: `https://hayatokano.com/works/${slug}`,
      siteName: "Hayato Kano",
      locale: "ja_JP",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function WorkDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const allWorks = await getWorks();
  const work = allWorks.find((w) => w.slug === slug);
  if (!work) return notFound();

  return (
    <CanvasShell>
      <WorkDetailClient work={work} allWorks={allWorks} initialSlug={slug} />
    </CanvasShell>
  );
}

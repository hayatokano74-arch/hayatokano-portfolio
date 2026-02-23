import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorkDetailClient } from "@/components/WorkDetailClient";
import { getWorks, getWorkBySlug } from "@/lib/works";
import { notFound } from "next/navigation";

/** 前後ナビ用の最小 slug リスト（全データを Client に送らないため） */
async function getWorkSlugs() {
  const all = await getWorks();
  return all.map((w) => ({ slug: w.slug }));
}

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
  const lead = work.media[0];
  const ogImage = lead?.type === "video" ? lead.poster : lead?.src;
  return {
    title: `${work.title} | ${work.year}`,
    description: work.excerpt,
    openGraph: {
      title: `${work.title} | ${work.year}`,
      description: work.excerpt,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function WorkDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [work, allWorks] = await Promise.all([
    getWorkBySlug(slug),
    getWorkSlugs(),
  ]);
  if (!work) return notFound();

  return (
    <CanvasShell>
      <WorkDetailClient work={work} allWorks={allWorks} />
    </CanvasShell>
  );
}

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
  const lead = work.media[0];
  const ogImage = lead?.type === "video" ? lead.poster : lead?.src;
  const title = `${work.title} | ${work.year}`;
  return {
    title,
    description: work.excerpt,
    openGraph: {
      title,
      description: work.excerpt,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: work.excerpt,
      ...(ogImage ? { images: [ogImage] } : {}),
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

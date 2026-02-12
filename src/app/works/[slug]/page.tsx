import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { WorkDetailClient } from "@/components/WorkDetailClient";
import { works } from "@/lib/mock";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return works.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find((w) => w.slug === slug);
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
  const work = works.find((w) => w.slug === slug);
  if (!work) return notFound();

  return (
    <CanvasShell>
      <WorkDetailClient work={work} />
    </CanvasShell>
  );
}

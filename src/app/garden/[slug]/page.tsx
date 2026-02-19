import type { Metadata } from "next";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenBacklinks } from "@/components/GardenBacklinks";
import { GardenTwoHopLinks } from "@/components/GardenTwoHopLinks";
import { getNodeBySlug, getAllPageSlugs, getVirtualPageTitle } from "@/lib/garden/reader";
import { getBacklinks, getTwoHopLinks } from "@/lib/garden/backlinks";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const node = await getNodeBySlug(decoded);
  if (node) return { title: node.title };
  const virtualTitle = getVirtualPageTitle(decoded);
  return { title: virtualTitle ?? decoded };
}

export default async function GardenNodePage({ params }: Props) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const node = await getNodeBySlug(decoded);

  // MDファイルがなくてもリンクされた時点でページは存在する
  const pageSlug = node?.slug ?? decoded;
  const pageTitle = node?.title ?? getVirtualPageTitle(decoded) ?? decoded;

  const backlinks = getBacklinks(pageSlug);
  const twoHopLinks = getTwoHopLinks(pageSlug);

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <article className="garden-detail">
        <h1 className="garden-detail-title">{pageTitle}</h1>

        {node && (
          <>
            <time className="garden-detail-date">{node.date}</time>
            <div
              className="garden-detail-body"
              dangerouslySetInnerHTML={{ __html: node.contentHtml }}
            />
          </>
        )}

        <GardenBacklinks backlinks={backlinks} />
        <GardenTwoHopLinks links={twoHopLinks} />

        <div className="garden-detail-back">
          <Link href="/garden" className="action-link">
            ← Garden に戻る
          </Link>
        </div>
      </article>
    </CanvasShell>
  );
}

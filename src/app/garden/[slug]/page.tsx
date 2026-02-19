import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenBacklinks } from "@/components/GardenBacklinks";
import { getAllNodes, getNodeBySlug } from "@/lib/garden/reader";
import { getBacklinks } from "@/lib/garden/backlinks";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const nodes = await getAllNodes();
  return nodes.map((node) => ({ slug: node.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const node = await getNodeBySlug(decodeURIComponent(slug));
  if (!node) return { title: "Not Found" };
  return { title: node.title };
}

export default async function GardenNodePage({ params }: Props) {
  const { slug } = await params;
  const node = await getNodeBySlug(decodeURIComponent(slug));
  if (!node) notFound();

  const backlinks = getBacklinks(node.slug);

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showCategoryRow={false} showSearch={false} />
      <article className="garden-detail">
        <div className="garden-detail-meta">
          <time className="garden-detail-date">{node.date}</time>
          {node.tags.length > 0 && (
            <div className="garden-detail-tags">
              {node.tags.map((tag) => (
                <span key={tag} className="garden-card-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <h1 className="garden-detail-title">{node.title}</h1>
        <div
          className="garden-detail-body"
          dangerouslySetInnerHTML={{ __html: node.contentHtml }}
        />
        <GardenBacklinks backlinks={backlinks} />
        <div className="garden-detail-back">
          <Link href="/garden" className="action-link">
            ← Garden に戻る
          </Link>
        </div>
      </article>
    </CanvasShell>
  );
}

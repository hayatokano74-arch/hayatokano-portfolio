import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenBody } from "@/components/GardenBody";
import { GardenDetailRelated } from "@/components/GardenDetailRelated";
import { GardenNavigation } from "@/components/GardenNavigation";
import { getNodeBySlug, getAllPageSlugs, getVirtualPageTitle, getAdjacentNodes } from "@/lib/garden/reader";
import { getLinkedPages, getTwoHopLinks } from "@/lib/garden/backlinks";

const BASE_URL = "https://hayatokano.com";

interface Props {
  params: Promise<{ slug: string }>;
}

/* ISR: CDNキャッシュを1時間保持（静的エクスポート時は無視される） */
export const revalidate = 3600;

/* 静的エクスポート時は dynamicParams 不可 → generateStaticParams の結果のみ生成 */
export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const slugs = await getAllPageSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // ビルド時に Dropbox に接続できない場合は空を返す（ISR で動的生成される）
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const node = await getNodeBySlug(decoded);

  if (node) {
    const description = node.excerpt.length > 160
      ? node.excerpt.slice(0, 157) + "…"
      : node.excerpt;
    const url = `${BASE_URL}/garden/${encodeURIComponent(node.slug)}`;

    return {
      title: node.title,
      description,
      openGraph: {
        title: node.title,
        description,
        type: "article",
        publishedTime: node.date,
        url,
      },
      twitter: {
        card: "summary",
        title: node.title,
        description,
      },
      alternates: {
        canonical: url,
      },
    };
  }

  const virtualTitle = await getVirtualPageTitle(decoded);
  return { title: virtualTitle ?? decoded };
}

export default async function GardenNodePage({ params }: Props) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const node = await getNodeBySlug(decoded);

  // MDファイルがなくてもリンクされた時点でページは存在する
  const pageSlug = node?.slug ?? decoded;
  const pageTitle = node?.title ?? (await getVirtualPageTitle(decoded)) ?? decoded;

  const linkedPages = await getLinkedPages(pageSlug);
  const twoHopGroups = await getTwoHopLinks(pageSlug);
  const adjacent = await getAdjacentNodes(pageSlug);

  /* JSON-LD 構造化データ（BlogPosting） */
  const jsonLd = node
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: node.title,
        datePublished: node.date,
        author: { "@type": "Person", name: "Hayato Kano" },
        publisher: { "@type": "Person", name: "Hayato Kano" },
        description: node.excerpt,
        mainEntityOfPage: `${BASE_URL}/garden/${encodeURIComponent(node.slug)}`,
      }
    : null;

  return (
    <CanvasShell>
      <Header active="Garden" title="Garden" showTitleRow={false} showCategoryRow={false} showSearch={false} />
      <article className="garden-detail">
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}

        <h1 className="garden-detail-title">{pageTitle}</h1>

        {node && (
          <>
            <div className="garden-detail-meta">
              <time className="garden-detail-date">{node.date}</time>
            </div>
            <GardenBody html={node.contentHtml} className="garden-detail-body" />
          </>
        )}

        <GardenDetailRelated linkedPages={linkedPages} twoHopGroups={twoHopGroups} />

        <GardenNavigation prev={adjacent.prev} next={adjacent.next} />
      </article>
    </CanvasShell>
  );
}

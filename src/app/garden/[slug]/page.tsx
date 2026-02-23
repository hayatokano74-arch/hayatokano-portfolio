import type { Metadata } from "next";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { GardenDetailRelated } from "@/components/GardenDetailRelated";
import { getNodeBySlug, getAllPageSlugs, getVirtualPageTitle } from "@/lib/garden/reader";
import { getLinkedPages, getTwoHopLinks } from "@/lib/garden/backlinks";

interface Props {
  params: Promise<{ slug: string }>;
}

/* サーバーレス関数の最大実行時間 */
export const maxDuration = 60;

/* 1時間ごとに Dropbox から最新データを再取得（429 防止） */
export const revalidate = 3600;

/* ビルド時に存在しないページも動的に生成する */
export const dynamicParams = true;

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
  if (node) return { title: node.title };
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

        <GardenDetailRelated linkedPages={linkedPages} twoHopGroups={twoHopGroups} />

        <div className="garden-detail-back">
          <Link href="/garden" className="action-link">
            ← Garden に戻る
          </Link>
        </div>
      </article>
    </CanvasShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { getTexts, getTextBySlug } from "@/lib/text";
import { notFound } from "next/navigation";
import { TextToc } from "@/components/TextToc";

export async function generateStaticParams() {
  const texts = await getTexts();
  return texts.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getTextBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.body.slice(0, 160),
  };
}

export default async function TextDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getTextBySlug(slug);
  if (!post) return notFound();

  return (
    <CanvasShell>
      <Header active="Text" title="Text" showCategoryRow={false} />
      <div className="text-detail-layout">
        {/* 左: Reading リンク（列1-2） */}
        <div className="text-detail-rail">
          <Link
            href={`/text/${post.slug}/reading`}
            className="action-link"
            style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
          >
            <span>Reading</span>
            <span aria-hidden="true" style={{ fontSize: "0.95em" }}>↗</span>
          </Link>
        </div>

        {/* 中央: 本文（列4-9、6列分 ≈ 従来の640px） */}
        <div className="text-detail-main">
          <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, marginBottom: "var(--space-5)" }}>{post.title}</div>
          {post.sections?.length ? (
            <div>
              {post.sections.map((section) => (
                <section key={section.id} id={section.id} style={{ scrollMarginTop: "var(--space-10)", marginBottom: "var(--space-9)" }}>
                  <h2 style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, margin: "0 0 var(--space-3)" }}>
                    {section.heading}
                  </h2>
                  <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", whiteSpace: "pre-wrap", fontWeight: 500 }}>
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", whiteSpace: "pre-wrap", fontWeight: 500 }}>
              {post.body}
            </div>
          )}
        </div>

        {/* 右: 目次（列11-12） */}
        {post.toc ? <TextToc toc={post.toc} /> : null}
      </div>
    </CanvasShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { texts } from "@/lib/mock";
import { notFound } from "next/navigation";
import { TextToc } from "@/components/TextToc";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = texts.find((t) => t.slug === slug);
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
  const post = texts.find((t) => t.slug === slug);
  if (!post) return notFound();

  return (
    <CanvasShell>
      <Header active="Text" title="Text" showCategoryRow={false} />
      <div className="text-detail-layout flex" style={{ marginTop: "var(--space-14)", justifyContent: "space-between", gap: "var(--space-8)" }}>
        <div className="text-detail-rail" style={{ width: 280 }}>
          <Link
            href={`/text/${post.slug}/reading`}
            className="action-link"
            style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span>Reading</span>
            <span aria-hidden="true" style={{ fontSize: "0.95em", transform: "translateY(-0.5px)" }}>↗</span>
          </Link>
        </div>

        <div className="text-detail-main" style={{ width: "min(100%, 640px)", marginLeft: "auto", marginRight: "auto" }}>
          <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, marginBottom: "var(--space-5)", textAlign: "left" }}>{post.title}</div>
          {post.sections?.length ? (
            <div>
              {post.sections.map((section) => (
                <section key={section.id} id={section.id} style={{ scrollMarginTop: "var(--space-10)", marginBottom: "var(--space-9)" }}>
                  <h2 style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, margin: "0 0 var(--space-3)", textAlign: "left" }}>
                    {section.heading}
                  </h2>
                  <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", whiteSpace: "pre-wrap", fontWeight: 500, textAlign: "left" }}>
                    {section.body}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", whiteSpace: "pre-wrap", fontWeight: 500, textAlign: "left" }}>
              {post.body}
            </div>
          )}
        </div>

        {post.toc ? <TextToc toc={post.toc} /> : <div className="text-detail-toc-gap" style={{ width: 230 }} />}
      </div>
    </CanvasShell>
  );
}

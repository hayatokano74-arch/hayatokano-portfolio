import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { getTexts, getTextBySlug } from "@/lib/text";
import { notFound } from "next/navigation";
import { TextToc } from "@/components/TextToc";

export async function generateStaticParams() {
  const texts = await getTexts();
  return texts.map((t) => ({ slug: t.slug }));
}

export default async function ReadingMode({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getTextBySlug(slug);
  if (!post) return notFound();

  return (
    <CanvasShell>
      <div className="text-detail-layout flex items-start justify-between" style={{ gap: "var(--space-8)", marginTop: "var(--space-7)" }}>
        <div className="text-detail-rail" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>
          <Link
            href={`/text/${post.slug}`}
            className="action-link action-link-muted"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-1)", lineHeight: 1 }}
          >
            <span
              aria-hidden="true"
              style={{ width: 14, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="12" height="18" viewBox="0 0 12 18" fill="none">
                <path d="M9 2.5L3 9L9 15.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>Back</span>
          </Link>
        </div>

        <div className="text-detail-main">
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
            <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", whiteSpace: "pre-wrap", fontWeight: 500, textAlign: "left" }}>{post.body}</div>
          )}
        </div>

        {post.toc ? <TextToc toc={post.toc} /> : <div className="text-detail-toc-gap" style={{ width: 230 }} />}
      </div>
    </CanvasShell>
  );
}

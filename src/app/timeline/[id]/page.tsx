import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { timeline } from "@/lib/mock";
import { notFound } from "next/navigation";
import { blurDataURL } from "@/lib/blur";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = timeline.find((t) => t.id === id);
  if (!post) return {};
  return {
    title: `Time Line — ${post.date}`,
    description: post.text?.slice(0, 160) ?? "",
  };
}

export default async function TimelinePostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const index = timeline.findIndex((t) => t.id === id);
  if (index === -1) return notFound();

  const post = timeline[index];
  const prev = timeline[index - 1];
  const next = timeline[index + 1];

  return (
    <CanvasShell>
      <Header active="Time Line" title="Time Line" showCategoryRow={false} />

      <div style={{ marginTop: "var(--space-11)", width: "min(100%, 640px)", marginLeft: "auto", marginRight: "auto" }}>
        {/* ナビゲーション */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-8)" }}>
          <Link
            href="/timeline"
            className="action-link action-link-muted"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--font-body)", fontWeight: 700, lineHeight: 1 }}
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
          <div style={{ display: "flex", gap: "var(--space-7)", fontSize: "var(--space-7)", lineHeight: 1 }}>
            {prev ? (
              <Link href={`/timeline/${prev.id}`} className="action-link action-link-muted" aria-label="前の投稿">
                ‹
              </Link>
            ) : (
              <span style={{ color: "var(--muted)", opacity: 0.4 }}>‹</span>
            )}
            {next ? (
              <Link href={`/timeline/${next.id}`} className="action-link action-link-muted" aria-label="次の投稿">
                ›
              </Link>
            ) : (
              <span style={{ color: "var(--muted)", opacity: 0.4 }}>›</span>
            )}
          </div>
        </div>

        {/* 日付 */}
        <div style={{ fontSize: "var(--font-meta)", lineHeight: "var(--lh-normal)", color: "var(--muted)", letterSpacing: "0.08em", marginBottom: "var(--space-3)" }}>
          {post.date}
        </div>

        {/* 画像 */}
        {post.type === "photo" && post.images && post.images.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            {post.images.map((img, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  width: "min(60%, 400px)",
                  aspectRatio: `${img.width} / ${img.height}`,
                  overflow: "hidden",
                }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 900px) 60vw, 400px"
                  placeholder="blur"
                  blurDataURL={blurDataURL(img.width, img.height)}
                  style={{ objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {/* テキスト */}
        {post.text ? (
          <div style={{
            fontSize: "var(--font-body)",
            lineHeight: "var(--lh-relaxed)",
            fontWeight: 500,
            whiteSpace: "pre-wrap",
          }}>
            {post.text}
          </div>
        ) : null}
      </div>
    </CanvasShell>
  );
}

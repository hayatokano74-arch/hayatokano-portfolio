import type { Metadata } from "next";
import Image from "next/image";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { news } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

export const metadata: Metadata = { title: "News" };

export default function NewsPage() {
  return (
    <CanvasShell>
      <Header active="News" title="News" showCategoryRow={false} />
      <div style={{ marginTop: "var(--space-12)" }}>
        {news.map((item, i) => (
          <div key={item.id}>
            {i > 0 ? <div className="hrline" style={{ marginBottom: "var(--space-7)" }} /> : null}
            <article
              className="news-row"
              style={{
                display: "grid",
                gridTemplateColumns: item.image ? "minmax(0, 1fr) 240px" : "1fr",
                alignItems: "start",
                columnGap: "var(--space-8)",
                marginBottom: "var(--space-7)",
              }}
            >
              {/* テキスト */}
              <div>
                <div
                  style={{
                    fontSize: "var(--font-meta)",
                    lineHeight: "var(--lh-normal)",
                    letterSpacing: "0.08em",
                    color: "var(--muted)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {item.date}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-body)",
                    lineHeight: "var(--lh-normal)",
                    fontWeight: 700,
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-body)",
                    lineHeight: "var(--lh-relaxed)",
                    fontWeight: 500,
                  }}
                >
                  {item.body}
                </div>
              </div>

              {/* 画像 */}
              {item.image ? (
                <div className="news-row-image">
                  <Image
                    src={item.image.src}
                    alt={item.title}
                    width={item.image.width}
                    height={item.image.height}
                    placeholder="blur"
                    blurDataURL={blurDataURL(item.image.width, item.image.height)}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                    }}
                  />
                </div>
              ) : null}
            </article>
          </div>
        ))}
      </div>
    </CanvasShell>
  );
}

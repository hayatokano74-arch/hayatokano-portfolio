import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Work } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

/** リスト表示のExcerpt最大文字数（デフォルト: 200） */
const DEFAULT_EXCERPT_MAX_LENGTH = 200;

export function WorksClient<T extends Work>({
  works,
  view,
  basePath = "/works",
  detailQuery = "?mode=gallery&img=1",
  renderListDetail,
  excerptMaxLength = DEFAULT_EXCERPT_MAX_LENGTH,
}: {
  works: T[];
  view: "grid" | "list";
  basePath?: "/works" | "/me-no-hoshi";
  detailQuery?: string;
  renderListDetail?: (work: T) => ReactNode;
  /** リスト表示でのExcerpt最大文字数。0で無制限 */
  excerptMaxLength?: number;
}) {
  const detailHref = (slug: string) => `${basePath}/${slug}${detailQuery}`;
  return (
    <div style={{ marginTop: "var(--space-6)" }}>
      {view === "grid" ? (
        <WorksGrid works={works} detailHref={detailHref} />
      ) : (
        <WorksList works={works} detailHref={detailHref} renderListDetail={renderListDetail} excerptMaxLength={excerptMaxLength} />
      )}
    </div>
  );
}

function ThumbRect({ src, alt }: { src?: string; alt?: string }) {
  if (src) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "var(--media-bg)" }}>
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          loading="lazy"
          sizes="(max-width: 900px) 100vw, (max-width: 1400px) 33vw, 420px"
          placeholder="blur"
          blurDataURL={blurDataURL(1280, 720)}
          style={{
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );
  }
  return <div style={{ width: "100%", aspectRatio: "16 / 9", background: "var(--media-bg)" }} />;
}

function WorksGrid<T extends Work>({ works, detailHref }: { works: T[]; detailHref: (slug: string) => string }) {
  const count = works.length;
  const maxCols = Math.min(count || 1, 8);

  // 投稿数に応じた最大列数を制限する動的グリッド
  // auto-fill の最小幅を計算: (100% - gap合計) / maxCols
  // これにより maxCols 列以上は生成されない
  const gapPx = 24; // var(--space-5) ≈ 24px
  const gapTotal = (maxCols - 1) * gapPx;
  const gridTemplateColumns = maxCols === 1
    ? "repeat(auto-fill, minmax(190px, 320px))"
    : `repeat(auto-fill, minmax(max(190px, calc((100% - ${gapTotal}px) / ${maxCols})), 1fr))`;

  return (
    <div style={{ position: "relative", paddingBottom: "var(--space-14)" }}>
      <div
        className="works-grid"
        style={{ gridTemplateColumns }}
      >
        {works.map((w) => (
          (() => {
            const lead = w.media[0];
            const thumbSrc = w.thumbnail?.src ?? (lead?.type === "video" ? lead.poster : lead?.src);
            const thumbAlt = w.thumbnail?.alt ?? lead?.alt;
            return (
          <Link
            key={w.slug}
            href={detailHref(w.slug)}
            prefetch={true}
            className="work-grid-item"
            style={{ display: "block" }}
          >
            <ThumbRect src={thumbSrc} alt={thumbAlt} />
            <div
              style={{
                marginTop: "var(--space-2)",
                fontSize: "var(--font-meta)",
                lineHeight: "var(--lh-normal)",
                opacity: 0,
                transition: "opacity 120ms linear",
              }}
              className="work-grid-meta"
            >
              {w.title} | {w.year}
            </div>
          </Link>
            );
          })()
        ))}
      </div>

      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: "var(--space-2)" }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderBottom: "1px solid var(--muted)",
            borderRight: "1px solid var(--muted)",
            transform: "rotate(45deg)",
          }}
        />
      </div>
    </div>
  );
}

/** HTMLタグを除去してプレーンテキストにする */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function truncateText(text: string, maxLength: number): string {
  const plain = stripHtml(text).replace(/\r\n/g, "\n");
  if (maxLength <= 0 || plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength) + "...";
}

function WorksList<T extends Work>({
  works,
  detailHref,
  renderListDetail,
  excerptMaxLength = DEFAULT_EXCERPT_MAX_LENGTH,
}: {
  works: T[];
  detailHref: (slug: string) => string;
  renderListDetail?: (work: T) => ReactNode;
  excerptMaxLength?: number;
}) {
  return (
    <div>
      <div className="hrline" />
      {works.map((w) => (
        <div key={w.slug}>
          {(() => {
            const lead = w.media[0];
            const thumbSrc = w.thumbnail?.src ?? (lead?.type === "video" ? lead.poster : lead?.src);
            const thumbAlt = w.thumbnail?.alt ?? lead?.alt;
            const isPortraitLead = (lead?.height ?? 0) > (lead?.width ?? 0);
            return (
          <details className="works-row">
            {/* サマリー行: 12カラムグリッド */}
            <summary className="works-list-summary">
              <div className="works-list-summary-date" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>{w.date}</div>
              <div className="works-list-summary-title">{w.title}</div>
              <div className="works-list-summary-tags" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 600 }}>
                {w.tags.join("    ")}
              </div>
              <div className="works-list-summary-thumb">
                {thumbSrc ? (
                  <Image
                    src={thumbSrc}
                    alt={thumbAlt ?? ""}
                    width={32}
                    height={32}
                    loading="lazy"
                    style={{ width: 32, height: 32, objectFit: "cover", display: "block", background: "var(--media-bg)" }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, background: "var(--media-bg)" }} />
                )}
              </div>
            </summary>

            {/* ディテール行: 12カラムグリッド */}
            <div className="works-list-detail">
              <div className="works-list-spacer" />
              <div className="works-list-body">
                <div className="works-list-open-tags" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
                  {w.tags.join("    ")}
                </div>
                {renderListDetail ? <div className="works-list-detail-content" style={{ marginBottom: "var(--space-4)" }}>{renderListDetail(w)}</div> : null}
                <div className="works-list-excerpt" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", whiteSpace: "pre-wrap" }}>{truncateText(w.excerpt, excerptMaxLength)}</div>
                <div
                  className="works-list-view"
                  style={{
                    marginTop: "var(--space-3)",
                    marginBottom: "var(--space-3)",
                    fontSize: "var(--font-body)",
                    lineHeight: "var(--lh-normal)",
                    fontWeight: 700,
                    display: "flex",
                    justifyContent: "flex-start",
                  }}
                >
                  <Link className="action-link" href={detailHref(w.slug)}>
                    View All ↗
                  </Link>
                </div>
              </div>
              <div className={`works-list-media ${isPortraitLead ? "is-portrait" : ""}`.trim()}>
                <Link href={detailHref(w.slug)} className="action-link" style={{ display: "block" }}>
                  {thumbSrc ? (
                    <Image
                      src={thumbSrc}
                      alt={thumbAlt ?? ""}
                      width={lead?.width ?? 1280}
                      height={lead?.height ?? 720}
                      loading="lazy"
                      style={{
                        aspectRatio: `${lead?.width ?? 1280} / ${lead?.height ?? 720}`,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div style={{ aspectRatio: "16 / 10" }} />
                  )}
                </Link>
              </div>
            </div>
          </details>
            );
          })()}
          <div className="hrline" />
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { Work } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

/** WorksClient が受け取れる最小型（details を柔軟に） */
type WorkLike = Omit<Work, "details"> & { details: unknown };

/** リスト表示のExcerpt最大文字数（デフォルト: 200） */
const DEFAULT_EXCERPT_MAX_LENGTH = 200;

export function WorksClient<T extends WorkLike>({
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

/* グリッド用 DETAILS（投稿ごとに値があるフィールドだけ表示） */
function GridDetails({ details }: { details: unknown }) {
  let rows: { label: string; value: string | undefined }[];

  /* 配列形式（MeNoHoshi）: そのまま使う */
  if (Array.isArray(details)) {
    rows = (details as { label: string; value: string }[]).map((d) => ({ label: d.label, value: d.value }));
  } else {
    /* オブジェクト形式（Works）: 既存ロジック */
    const d = details as Work["details"];
    rows = [
      { label: "ARTIST", value: d.artist },
      { label: "PERIOD", value: d.period },
      { label: "VENUE", value: d.venue },
      { label: "ADDRESS", value: d.address },
      { label: "ACCESS", value: d.access },
      { label: "HOURS", value: d.hours },
      { label: "CLOSED", value: d.closed },
      { label: "ADMISSION", value: d.admission },
      { label: "ORGANIZER", value: d.organizer },
      { label: "CURATOR", value: d.curator },
      { label: "MEDIUM", value: d.medium },
      { label: "DIMENSIONS", value: d.dimensions },
      { label: "EDITION", value: d.edition },
      { label: "SERIES", value: d.series },
      { label: "PUBLISHER", value: d.publisher },
      { label: "PAGES", value: d.pages },
      { label: "BINDING", value: d.binding },
      { label: "PRICE", value: d.price },
      { label: "PHOTO", value: d.credit_photo },
      { label: "DESIGN", value: d.credit_design },
      { label: "COOPERATION", value: d.credit_cooperation },
    ];
  }
  rows = rows.filter((r) => r.value);
  if (rows.length === 0) return null;
  return (
    <div className="work-grid-details">
      {rows.map((r) => (
        <div key={r.label} className="work-grid-details-row">
          <span className="work-grid-details-label">{r.label}</span>
          <span className="work-grid-details-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function WorksGrid<T extends WorkLike>({ works, detailHref }: { works: T[]; detailHref: (slug: string) => string }) {
  return (
    <div style={{ position: "relative", paddingBottom: "var(--space-14)" }}>
      <div
        className="works-grid"
        style={{
          gap: "var(--space-7)",
          alignItems: "start",
        }}
      >
        {works.map((w) => {
          const lead = w.media[0];
          const thumbSrc = w.thumbnail?.src ?? (lead?.type === "video" ? lead.poster : lead?.src);
          const thumbAlt = w.thumbnail?.alt ?? lead?.alt;
          return (
            <Link
              key={w.slug}
              href={detailHref(w.slug)}
              prefetch={true}
              className="work-grid-item"
            >
              <ThumbRect src={thumbSrc} alt={thumbAlt} />
              <div className="work-grid-divider" />
              <div className="work-grid-info">
                <span className="work-grid-title">{w.title}</span>
                <span className="work-grid-detail">
                  {w.year && <span>{w.year}</span>}
                </span>
              </div>
              {w.tags.length > 0 && (
                <div className="work-grid-tags">
                  {w.tags.map((tag, i) => <span key={i}>{tag}</span>)}
                </div>
              )}
              <GridDetails details={w.details} />
            </Link>
          );
        })}
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

function WorksList<T extends WorkLike>({
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
              <div className="works-list-summary-title" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>{w.title}</div>
              <div className="works-list-summary-tags" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 600 }}>
                {w.tags.map((tag, i) => <span key={i}>{tag}</span>)}
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
                <div className="works-list-media-inner">
                  <div className="works-list-open-tags" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
                    {w.tags.map((tag, i) => <span key={i}>{tag}</span>)}
                  </div>
                  <Link href={detailHref(w.slug)} className="action-link" style={{ display: "block" }}>
                    {thumbSrc ? (
                      <Image
                        src={thumbSrc}
                        alt={thumbAlt ?? ""}
                        width={lead?.width ?? 1280}
                        height={lead?.height ?? 720}
                        loading="lazy"
                        className="list-media-img"
                        style={{
                          aspectRatio: `${lead?.width ?? 1280} / ${lead?.height ?? 720}`,
                        }}
                      />
                    ) : (
                      <div className="list-media-img" style={{ aspectRatio: "16 / 10" }} />
                    )}
                  </Link>
                </div>
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

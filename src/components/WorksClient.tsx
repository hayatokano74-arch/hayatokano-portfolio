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
    <div>
      {view === "grid" ? (
        <WorksGrid works={works} detailHref={detailHref} showDetails={basePath === "/me-no-hoshi"} />
      ) : (
        <WorksList works={works} detailHref={detailHref} renderListDetail={renderListDetail} excerptMaxLength={excerptMaxLength} />
      )}
    </div>
  );
}

function ThumbRect({ src, alt, width, height }: { src?: string; alt?: string; width?: number; height?: number }) {
  const isPortrait = (height ?? 0) > (width ?? 0);
  if (src) {
    return (
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 2", background: "var(--media-bg)" }}>
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          loading="lazy"
          sizes="(max-width: 900px) 100vw, (max-width: 1400px) 33vw, 420px"
          placeholder="blur"
          blurDataURL={blurDataURL(1280, 720)}
          style={{
            objectFit: isPortrait ? "contain" : "cover",
            display: "block",
          }}
        />
      </div>
    );
  }
  return <div style={{ width: "100%", aspectRatio: "3 / 2", background: "var(--media-bg)" }} />;
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
      /* 展示情報 */
      { label: "TYPE", value: d.exhibition_type },
      { label: "EXHIBITION", value: d.exhibition_title },
      { label: "ARTIST", value: d.artist },
      { label: "ARTISTS", value: d.artists },
      { label: "PERIOD", value: d.period },
      { label: "VENUE", value: d.venue },
      { label: "ADDRESS", value: d.address },
      { label: "ACCESS", value: d.access },
      { label: "HOURS", value: d.hours },
      { label: "CLOSED", value: d.closed },
      { label: "ADMISSION", value: d.admission },
      { label: "ORGANIZER", value: d.organizer },
      { label: "CURATOR", value: d.curator },
      { label: "SUPPORTED BY", value: d.supported_by },
      { label: "WEBSITE", value: d.url },
      /* 作品情報 */
      { label: "MEDIUM", value: d.medium },
      { label: "DIMENSIONS", value: d.dimensions },
      { label: "EDITION", value: d.edition },
      { label: "SERIES", value: d.series },
      /* 出版情報 */
      { label: "PUBLISHER", value: d.publisher },
      { label: "PAGES", value: d.pages },
      { label: "BINDING", value: d.binding },
      { label: "PRICE", value: d.price },
      /* クレジット */
      { label: "PHOTO", value: d.credit_photo },
      { label: "DESIGN", value: d.credit_design },
      { label: "TEXT", value: d.credit_text },
      { label: "SOUND", value: d.credit_sound },
      { label: "VIDEO", value: d.credit_video },
      { label: "TRANSLATION", value: d.credit_translation },
      { label: "COOPERATION", value: d.credit_cooperation },
      /* 実績 */
      { label: "AWARD", value: d.award },
      { label: "COLLECTION", value: d.collection },
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

function WorksGrid<T extends WorkLike>({ works, detailHref, showDetails = false }: { works: T[]; detailHref: (slug: string) => string; showDetails?: boolean }) {
  return (
    <div style={{ position: "relative", paddingBottom: "var(--space-14)" }}>
      <div className="works-grid">
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
              <ThumbRect src={thumbSrc} alt={thumbAlt} width={w.thumbnail?.width ?? lead?.width} height={w.thumbnail?.height ?? lead?.height} />
              <div className="work-grid-divider" />
              <div className="work-grid-info">
                <span className="work-grid-title">{w.title}</span>
                <span className="work-grid-detail">
                  {w.year && <span>{w.year}</span>}
                </span>
              </div>
              {showDetails && w.tags.length > 0 && (
                <div className="work-grid-tags">
                  {w.tags.map((tag, i) => <span key={i}>{tag}</span>)}
                </div>
              )}
              {showDetails && <GridDetails details={w.details} />}
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
              {w.tags.length > 0 && (
              <div className="works-list-summary-tags" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 600 }}>
                {w.tags.map((tag, i) => <span key={i}>{tag}</span>)}
              </div>
              )}
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

            {/* ディテール行: 12カラムグリッド
                モバイルでは order で並び替え: タグ→写真→本文(ディテール+抜粋+View All) */}
            <div className="works-list-detail">
              <div className="works-list-spacer" />
              {/* タグ: モバイルで order: 1 */}
              {w.tags.length > 0 && (
              <div className="works-list-open-tags" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>
                {w.tags.map((tag, i) => <span key={i}>{tag}</span>)}
              </div>
              )}
              {/* 写真: モバイルで order: 2 */}
              <div className={`works-list-media ${isPortraitLead ? "is-portrait" : ""}`.trim()}>
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
              {/* 本文(ディテール+抜粋+View All): モバイルで order: 3 */}
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
                    View All <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginLeft: 4, verticalAlign: "middle" }}><path d="M2 10L10 2M10 2H4M10 2v6" /></svg>
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

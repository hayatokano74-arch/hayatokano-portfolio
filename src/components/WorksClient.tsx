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
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
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
  return <div style={{ width: "100%", aspectRatio: "16 / 9", background: "#000" }} />;
}

function WorksGrid<T extends Work>({ works, detailHref }: { works: T[]; detailHref: (slug: string) => string }) {
  return (
    <div style={{ position: "relative", paddingBottom: "var(--space-14)" }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "var(--space-5)",
          alignItems: "start",
        }}
      >
        {works.map((w) => (
          (() => {
            const lead = w.media[0];
            const thumbSrc = lead?.type === "video" ? lead.poster : lead?.src;
            return (
          <Link
            key={w.slug}
            href={detailHref(w.slug)}
            prefetch={true}
            className="work-grid-item"
            style={{ display: "block" }}
          >
            <ThumbRect src={thumbSrc} alt={lead?.alt} />
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
            borderBottom: "1px solid #9e9e9e",
            borderRight: "1px solid #9e9e9e",
            transform: "rotate(45deg)",
          }}
        />
      </div>
    </div>
  );
}

function truncateText(text: string, maxLength: number): string {
  if (maxLength <= 0 || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
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
            const thumbSrc = lead?.type === "video" ? lead.poster : lead?.src;
            const isPortraitLead = (lead?.height ?? 0) > (lead?.width ?? 0);
            return (
          <details className="works-row">
            {/* サマリー行: 12カラムグリッド */}
            <summary className="works-list-summary">
              <div className="works-list-summary-date" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>{w.date}</div>
              <div className="works-list-summary-title" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>{w.title}</div>
              <div className="works-list-summary-tags" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 600 }}>
                {w.tags.join("    ")}
              </div>
              <div className="works-list-summary-thumb">
                {thumbSrc ? (
                  <Image
                    src={thumbSrc}
                    alt={lead?.alt ?? ""}
                    width={32}
                    height={32}
                    loading="lazy"
                    style={{ width: 32, height: 32, objectFit: "cover", display: "block", background: "#000" }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, background: "#000" }} />
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
                      alt={lead?.alt ?? ""}
                      width={lead?.width ?? 1280}
                      height={lead?.height ?? 720}
                      loading="lazy"
                      style={{
                        width: "100%",
                        maxWidth: 520,
                        aspectRatio: `${lead?.width ?? 1280} / ${lead?.height ?? 720}`,
                        objectFit: "cover",
                        marginLeft: "auto",
                        display: "block",
                        background: "#000",
                      }}
                    />
                  ) : (
                    <div style={{ width: "100%", maxWidth: 520, aspectRatio: "16 / 10", background: "#000", marginLeft: "auto" }} />
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

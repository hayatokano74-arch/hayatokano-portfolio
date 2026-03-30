import Image from "next/image";
import type { MeNoHoshiPost } from "@/lib/meNoHoshi";
import { blurDataURL } from "@/lib/blur";

/** WPコメント除去 + 先頭・末尾の <br> を除去 */
function cleanWpHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(\s*<br\s*\/?>)+/i, "")
    .replace(/(<br\s*\/?>)+\s*$/i, "")
    .trim();
}

/** HTML を剥いてプレーンテキスト行の配列に変換（元のBIO表示方式に合わせる） */
function htmlToLines(html: string): string[] {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function MeNoHoshiDetail({ post }: { post: MeNoHoshiPost }) {
  const hero = post.media[0];
  const keyVisuals =
    post.keyVisuals.length > 0
      ? post.keyVisuals
      : [
          {
            id: `${post.slug}-key-visual-fallback`,
            image: {
              src: hero.src,
              alt: hero.alt,
              width: hero.width,
              height: hero.height,
            },
            caption: "",
          },
        ];
  /* ARTISTはPROFILEに移動 — DETAILSから除外 */
  const artistRow = post.details.find((row) => row.key === "artist");
  const detailRows = post.details.filter((row) => row.value && row.key !== "artist");

  /* BIOを行ごとに分割（元の表示方式を復元） */
  const bioLines = post.bio ? htmlToLines(post.bio) : [];

  /* PROFILEセクションの表示条件 */
  const hasProfile = !!artistRow?.value || bioLines.length > 0 || post.pastExhibitions.length > 0 || post.snsLinks.length > 0;

  return (
    <section className="me-no-hoshi-detail">
      {/* タイトル: グリッド独立アイテム（モバイルでキービジュアルの前に来るよう分離） */}
      <div className="me-no-hoshi-title" style={{ fontSize: "var(--font-heading)", fontWeight: 700, lineHeight: "var(--lh-normal)" }}>
        {post.title}
      </div>

      <div className="me-no-hoshi-meta-column">
        {/* TEXT（ステートメント） */}
        <div>
          <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>TEXT</div>
          <div
            className="mnh-rich-text"
            style={{ marginTop: "var(--v-element)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", fontWeight: 500 }}
            dangerouslySetInnerHTML={{ __html: cleanWpHtml(post.statement) }}
          />
        </div>

        {/* DETAILS + PROFILE: 共通グリッドで包み subgrid によりラベル列幅を自動同幅化 */}
        <div className="mnh-meta-tables" style={{ marginTop: "var(--v-heading)" }}>
          {/* DETAILS（展示情報） */}
          <section className="work-details-table">
            <div className="work-details-table-header">DETAILS</div>
            {detailRows.map((row) => (
              <div key={row.key} className="work-details-row">
                <div className="work-details-label">{row.label ? `${row.label}:` : ""}</div>
                <div className="work-details-value">{row.value}</div>
              </div>
            ))}
          </section>

          {/* PROFILE（ARTIST / BIO / SNS リンク） */}
          {hasProfile && (
            <section className="work-details-table" style={{ marginTop: "var(--v-heading)" }}>
              <div className="work-details-table-header">PROFILE</div>

              {/* ARTIST */}
              {artistRow?.value && (
                <div className="work-details-row">
                  <div className="work-details-label">ARTIST:</div>
                  <div className="work-details-value">{artistRow.value}</div>
                </div>
              )}

              {/* BIO（行ごとに分割、work-details-row--bio で薄い区切り線） */}
              {bioLines.map((line, i) => {
                return (
                  <div key={`bio-${i}`} className={`work-details-row${i !== 0 ? " work-details-row--bio" : ""}`}>
                    <div className="work-details-label">{i === 0 ? "BIO:" : ""}</div>
                    <div className="work-details-value">{line}</div>
                  </div>
                );
              })}

              {/* SNS リンク */}
              {post.snsLinks.map((link, i) => (
                <div key={`sns-${i}`} className="work-details-row">
                  <div className="work-details-label">{link.label ? `${link.label}:` : "LINK:"}</div>
                  <div className="work-details-value">
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                      {link.url}
                    </a>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* EXHIBITION: CV風（年号 + 展示情報の2列） */}
        {post.pastExhibitions.length > 0 && (
          <div style={{ marginTop: "var(--v-heading)" }}>
            <div className="work-details-table-header">EXHIBITION</div>
            {post.pastExhibitions.map((item, i) => (
              <div key={`ex-${i}`}>
                <div className="hrline" />
                <div className="mnh-exhibition-row">
                  <div className="mnh-exhibition-year">{item.year}</div>
                  <div className="mnh-exhibition-info">{item.info}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTICE（注釈） */}
        <div style={{ marginTop: "var(--v-block)", fontSize: "var(--font-meta)", lineHeight: "var(--lh-relaxed)", color: "var(--muted)" }}>{post.notice}</div>
      </div>

      {/* KEY VISUAL: 独立グリッドアイテム（モバイルで order: -1 によりトップに表示） */}
      {post.showKeyVisuals && (
        <div className="me-no-hoshi-key-visual">
          <div className="me-no-hoshi-section is-first">
            <div className="me-no-hoshi-section-label">KEY VISUAL</div>
            <div className="single-col-grid" style={{ marginTop: "var(--v-element)", gap: "var(--space-4)" }}>
              {keyVisuals.map((visual, idx) => {
                const isPortrait = visual.image.height > visual.image.width;
                return (
                <article key={visual.id}>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      ...(isPortrait
                        ? { maxHeight: "min(80vh, 900px)", aspectRatio: `${visual.image.width} / ${visual.image.height}`, margin: "0 auto" }
                        : { aspectRatio: `${visual.image.width} / ${visual.image.height}` }
                      ),
                      background: "var(--bg)",
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      src={visual.image.src}
                      alt={visual.image.alt}
                      fill
                      priority={idx === 0}
                      sizes="(max-width: 900px) 100vw, 920px"
                      placeholder="blur"
                      blurDataURL={blurDataURL(visual.image.width, visual.image.height)}
                      style={{ objectFit: "cover", objectPosition: "center" }}
                    />
                  </div>
                  {visual.caption ? (
                    <div style={{ marginTop: "var(--v-element)", fontSize: "var(--font-body)", color: "var(--muted)" }}>{visual.caption}</div>
                  ) : null}
                </article>
                );
              })}
            </div>
            <div style={{ marginTop: "var(--v-element)", fontSize: "var(--font-body)", color: "var(--muted)" }}>{post.heroCaption}</div>
          </div>
        </div>
      )}

      {/* PAST WORKS / ARCHIVE */}
      <div className="me-no-hoshi-visual-column">
        {post.showPastWorks && post.pastWorks.length > 0 && (
          <section className="me-no-hoshi-section">
            <div className="me-no-hoshi-section-label">PAST WORKS</div>

            <div
              className="me-no-hoshi-past-grid"
              style={{
                marginTop: "var(--v-element)",
                display: "grid",
                gap: "var(--space-5)",
              }}
            >
              {post.pastWorks.map((work) => {
                const isPortrait = work.image.height > work.image.width;
                return (
                <article key={work.id}>
                  <figure style={{ margin: 0 }}>
                    <Image
                      src={work.image.src}
                      alt={work.image.alt}
                      width={work.image.width}
                      height={work.image.height}
                      loading="lazy"
                      sizes="(max-width: 900px) 100vw, 46vw"
                      placeholder="blur"
                      blurDataURL={blurDataURL(work.image.width, work.image.height)}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "auto",
                        ...(isPortrait ? { maxHeight: "min(80vh, 900px)", objectFit: "contain" } : {}),
                        objectPosition: "left top",
                      }}
                    />
                    {(work.title || work.year) ? (
                      <figcaption style={{ marginTop: "var(--v-element)", fontSize: "var(--font-body)", color: "var(--muted)" }}>
                        {work.title}{work.title && work.year ? ` | ${work.year}` : work.year}
                      </figcaption>
                    ) : null}
                  </figure>
                </article>
                );
              })}
            </div>
          </section>
        )}

        {post.showArchiveWorks && post.archiveWorks.length > 0 && (
          <section className="me-no-hoshi-section">
            <div className="me-no-hoshi-section-label">ARCHIVE</div>

            <div
              className="me-no-hoshi-archive-grid"
              style={{
                marginTop: "var(--v-element)",
                display: "grid",
                gap: "var(--space-5)",
              }}
            >
              {post.archiveWorks.map((work) => {
                const isPortrait = work.image.height > work.image.width;
                return (
                <article key={work.id}>
                  <figure style={{ margin: 0 }}>
                    <Image
                      src={work.image.src}
                      alt={work.image.alt}
                      width={work.image.width}
                      height={work.image.height}
                      loading="lazy"
                      sizes="(max-width: 900px) 100vw, 920px"
                      placeholder="blur"
                      blurDataURL={blurDataURL(work.image.width, work.image.height)}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "auto",
                        ...(isPortrait ? { maxHeight: "min(80vh, 900px)", objectFit: "contain" } : {}),
                        objectPosition: "left top",
                      }}
                    />
                    {(work.title || work.year) ? (
                      <figcaption style={{ marginTop: "var(--v-element)", fontSize: "var(--font-body)", color: "var(--muted)" }}>
                        {work.title}{work.title && work.year ? ` | ${work.year}` : work.year}
                      </figcaption>
                    ) : null}
                  </figure>
                </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

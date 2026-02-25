import Image from "next/image";
import type { MeNoHoshiPost } from "@/lib/meNoHoshi";
import { blurDataURL } from "@/lib/blur";

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
  /* 空フィールドを除外して表示 */
  const tableRows = post.details.filter((row) => row.value);

  return (
    <section className="me-no-hoshi-detail" style={{ marginTop: "var(--space-7)" }}>
      <div className="me-no-hoshi-meta-column">
        <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1, fontWeight: 700 }}>{post.title}</h1>

        <div style={{ marginTop: "var(--space-10)", fontSize: "var(--font-meta)", lineHeight: "var(--lh-normal)", letterSpacing: "0.16em", color: "var(--muted)" }}>DETAILS</div>

        <div style={{ marginTop: "var(--space-2)", borderTop: "1px solid var(--line-light)" }}>
          {tableRows.map((row) => (
            <div
              key={row.key}
              className="work-details-row"
            >
              <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>{row.label}</div>
              <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>{row.value}</div>
            </div>
          ))}
        </div>

        {post.bio ? (
          <div
            style={{
              marginTop: "var(--space-6)",
              paddingTop: "var(--space-4)",
              paddingBottom: "var(--space-4)",
              borderBottom: "1px solid var(--line-light)",
            }}
          >
            <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>BIO</div>
            <div
              className="mnh-rich-text"
              style={{ marginTop: "var(--space-3)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", color: "var(--fg)" }}
              dangerouslySetInnerHTML={{ __html: post.bio }}
            />
          </div>
        ) : null}

        <div
          className="mnh-rich-text"
          style={{ marginTop: post.bio ? "var(--space-6)" : "var(--space-8)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", fontWeight: 500 }}
          dangerouslySetInnerHTML={{ __html: post.statement }}
        />
        <div style={{ marginTop: "var(--space-5)", fontSize: "var(--font-meta)", lineHeight: "var(--lh-relaxed)", color: "var(--muted)" }}>{post.notice}</div>
      </div>

      <div className="me-no-hoshi-visual-column">
        {post.showKeyVisuals && (
          <div className="me-no-hoshi-section is-first">
            <div className="me-no-hoshi-section-label">KEY VISUAL</div>
            <div className="single-col-grid" style={{ marginTop: "var(--space-3)", gap: "var(--space-4)" }}>
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
                    <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>{visual.caption}</div>
                  ) : null}
                </article>
                );
              })}
            </div>
            <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>{post.heroCaption}</div>
          </div>
        )}

        {post.showPastWorks && post.pastWorks.length > 0 && (
          <section className="me-no-hoshi-section">
            <div className="me-no-hoshi-section-label">PAST WORKS</div>

            <div
              className="me-no-hoshi-past-grid"
              style={{
                marginTop: "var(--space-3)",
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
                      <figcaption style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>
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
                marginTop: "var(--space-3)",
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
                      <figcaption style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>
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

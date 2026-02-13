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
  const tableRows: Array<{ label: string; value: string }> = [
    { label: "ARTIST", value: post.details.artist },
    { label: "PERIOD", value: post.details.period },
    { label: "VENUE", value: post.details.venue },
    { label: "HOURS", value: post.details.hours },
    { label: "CLOSED", value: post.details.closed },
    { label: "ADMISSION", value: post.details.admission },
    { label: "ADDRESS", value: post.details.address },
    { label: "ACCESS", value: post.details.access },
  ];

  return (
    <section className="me-no-hoshi-detail" style={{ marginTop: "var(--space-10)" }}>
      <div className="me-no-hoshi-meta-column">
        <h1 style={{ margin: 0, fontSize: "var(--font-heading)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>{post.title}</h1>

        <div style={{ marginTop: "var(--space-10)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", letterSpacing: "0.2em" }}>DETAILS</div>

        <div style={{ marginTop: "var(--space-2)", borderTop: "1px solid var(--line-light)" }}>
          {tableRows.map((row) => (
            <div
              key={row.label}
              style={{
                display: "grid",
                gridTemplateColumns: "112px minmax(0,1fr)",
                borderBottom: "1px solid var(--line-light)",
                gap: "var(--space-2)",
                paddingTop: "var(--space-2)",
                paddingBottom: "var(--space-2)",
              }}
            >
              <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>{row.label}</div>
              <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>{row.value}</div>
            </div>
          ))}
        </div>

        {post.details.bio ? (
          <div
            style={{
              marginTop: "var(--space-6)",
              paddingTop: "var(--space-4)",
              paddingBottom: "var(--space-4)",
              borderBottom: "1px solid var(--line-light)",
            }}
          >
            <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>BIO</div>
            <div style={{ marginTop: "var(--space-3)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", color: "var(--fg)", maxWidth: 460 }}>{post.details.bio}</div>
          </div>
        ) : null}

        <div style={{ marginTop: post.details.bio ? "var(--space-6)" : "var(--space-8)", fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", fontWeight: 500, maxWidth: 460 }}>{post.statement}</div>
        <div style={{ marginTop: "var(--space-5)", fontSize: "var(--font-meta)", lineHeight: "var(--lh-relaxed)", color: "var(--muted)", maxWidth: 460 }}>{post.notice}</div>
      </div>

      <div className="me-no-hoshi-visual-column">
        <div className="me-no-hoshi-section is-first">
          <div className="me-no-hoshi-section-label">KEY VISUAL</div>
          <div style={{ marginTop: "var(--space-3)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "var(--space-4)" }}>
            {keyVisuals.map((visual, idx) => (
              <article key={visual.id}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: `${visual.image.width} / ${visual.image.height}`,
                    maxHeight: "min(72vh, 820px)",
                    background: "var(--bg)",
                    overflow: "hidden",
                    display: "grid",
                    placeItems: "center",
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
                    style={{ objectFit: "contain", objectPosition: "center" }}
                  />
                </div>
                {visual.caption ? (
                  <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>{visual.caption}</div>
                ) : null}
              </article>
            ))}
          </div>
          <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>{post.heroCaption}</div>
        </div>

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
            {post.pastWorks.map((work) => (
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
                      maxHeight: "min(72vh, 820px)",
                      objectFit: "contain",
                      objectPosition: "left top",
                    }}
                  />
                  <figcaption style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>
                    {work.title}
                    {work.year ? ` | ${work.year}` : ""}
                  </figcaption>
                </figure>
              </article>
            ))}
          </div>
        </section>

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
            {post.archiveWorks.map((work) => (
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
                      maxHeight: "min(72vh, 820px)",
                      objectFit: "contain",
                      objectPosition: "left top",
                    }}
                  />
                  <figcaption style={{ marginTop: "var(--space-2)", fontSize: "var(--font-body)", color: "var(--muted)" }}>
                    {work.title}
                    {work.year ? ` | ${work.year}` : ""}
                  </figcaption>
                </figure>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

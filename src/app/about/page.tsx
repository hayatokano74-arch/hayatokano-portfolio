import type { Metadata } from "next";
import Image from "next/image";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { getAbout } from "@/lib/about";
import { blurDataURL } from "@/lib/blur";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const about = await getAbout();
  return (
    <CanvasShell>
      <Header active="About" title="About" showCategoryRow={false} />
      <div className="about-layout">
        {/* 左カラム: テキスト */}
        <div className="about-text">
          <div
            style={{
              fontSize: "var(--font-body)",
              lineHeight: "var(--lh-relaxed)",
              fontWeight: 500,
              whiteSpace: "pre-wrap",
              marginBottom: "var(--space-11)",
            }}
          >
            {about.statement}
          </div>

          {about.cv.map((row, i) =>
            /* year が空 → セクション見出し */
            !row.year ? (
              <div key={i}>
                <div
                  style={{
                    fontSize: "var(--font-meta)",
                    letterSpacing: "0.16em",
                    color: "var(--muted)",
                    paddingTop: i === 0 ? 0 : "var(--space-7)",
                    paddingBottom: "var(--space-3)",
                  }}
                >
                  {row.content}
                </div>
                <div className="hrline" />
              </div>
            ) : (
              <div key={i}>
                <div className="cv-detail-row">
                  <div
                    style={{
                      fontSize: "var(--font-body)",
                      lineHeight: "var(--lh-normal)",
                      fontWeight: 700,
                      color: "var(--muted)",
                    }}
                  >
                    {row.year}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-body)",
                      lineHeight: "var(--lh-normal)",
                      fontWeight: 500,
                    }}
                  >
                    {row.content}
                  </div>
                </div>
                <div className="hrline" />
              </div>
            ),
          )}
        </div>

        {/* 右カラム: 写真（縦一列） */}
        <div className="about-photos">
          {about.photos.map((photo, idx) => (
            <div
              key={idx}
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: `${photo.width} / ${photo.height}`,
                maxHeight: "min(72vh, 820px)",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                marginLeft: "auto",
              }}
            >
              <Image
                src={photo.src}
                alt="Hayato Kano"
                fill
                priority={idx === 0}
                sizes="(max-width: 900px) 100vw, 920px"
                placeholder="blur"
                blurDataURL={blurDataURL(photo.width, photo.height)}
                style={{ objectFit: "contain", objectPosition: "center" }}
              />
            </div>
          ))}
        </div>
      </div>
    </CanvasShell>
  );
}

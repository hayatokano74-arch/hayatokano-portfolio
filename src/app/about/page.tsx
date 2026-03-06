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
              marginBottom: "var(--v-page)",
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
                    paddingTop: i === 0 ? 0 : "var(--v-section)",
                    paddingBottom: "var(--v-element)",
                  }}
                >
                  {row.content}:
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

        {/* 右カラム: 写真（縦一列）— me-no-hoshi と同じ width/height 方式 */}
        <div className="about-photos">
          {about.photos.map((photo, idx) => (
            <Image
              key={idx}
              src={photo.src}
              alt="Hayato Kano"
              width={photo.width}
              height={photo.height}
              priority={idx === 0}
              sizes="(max-width: 900px) 100vw, 920px"
              placeholder="blur"
              blurDataURL={blurDataURL(photo.width, photo.height)}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
              }}
            />
          ))}
        </div>
      </div>
    </CanvasShell>
  );
}

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
      <Header active="About" title="About" showTitleRow={false} showCategoryRow={false} />
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

          {(() => {
            /* CVをセクションごとにグループ化 */
            const cvSections = about.cv.reduce<Array<{ label: string; rows: typeof about.cv }>>(
              (acc, row) => {
                if (!row.year) {
                  acc.push({ label: row.content, rows: [] });
                } else {
                  if (acc.length === 0) acc.push({ label: "", rows: [] });
                  acc[acc.length - 1].rows.push(row);
                }
                return acc;
              },
              [],
            );
            return cvSections.map((section, si) => (
              <section key={si} className="work-details-table" style={si > 0 ? { marginTop: "var(--v-heading)" } : undefined}>
                {section.label && <div className="work-details-table-header">{section.label}</div>}
                {section.rows.map((row, i) => (
                  <div key={i} className="work-details-row">
                    <div className="work-details-label">{row.year}</div>
                    <div className="work-details-value">{row.content}</div>
                  </div>
                ))}
              </section>
            ));
          })()}
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

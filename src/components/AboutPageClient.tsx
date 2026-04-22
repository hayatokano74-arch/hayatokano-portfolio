"use client";

import Image from "next/image";
import type { About } from "@/lib/about";
import { RichBody } from "@/components/RichBody";
import { Header } from "./Header";

export function AboutPageClient({ about }: { about: About | null }) {
  if (!about) {
    return (
      <>
        <Header active="About" title="About" showTitleRow={false} showCategoryRow={false} />
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--muted)" }}>
          データの取得に失敗しました
        </div>
      </>
    );
  }

  /* CVをセクションごとにグループ化 */
  const cvSections = about.cv.reduce<
    Array<{ label: string; rows: typeof about.cv }>
  >((acc, row) => {
    if (!row.year) {
      acc.push({ label: row.content, rows: [] });
    } else {
      if (acc.length === 0) acc.push({ label: "", rows: [] });
      acc[acc.length - 1].rows.push(row);
    }
    return acc;
  }, []);

  return (
    <>
      <Header active="About" title="About" showTitleRow={false} showCategoryRow={false} />
      <div className="about-layout">
        {/* 左カラム: テキスト */}
        <div className="about-text">
          <RichBody
            html={about.statement}
            style={{ marginBottom: "var(--v-page)" }}
          />
          {cvSections.map((section, si) => (
            <section
              key={si}
              className="work-details-table"
              style={si > 0 ? { marginTop: "var(--v-heading)" } : undefined}
            >
              {section.label && (
                <div className="work-details-table-header">{section.label}</div>
              )}
              {section.rows.map((row, i) => (
                <div key={i} className="work-details-row">
                  <div className="work-details-label">{row.year}</div>
                  <div className="work-details-value">{row.content}</div>
                </div>
              ))}
            </section>
          ))}
        </div>

        {/* 右カラム: 写真 */}
        <div className="about-photos">
          {about.photos.map((photo, idx) => (
            <Image
              key={idx}
              src={photo.src}
              alt="Hayato Kano"
              width={photo.width || 1200}
              height={photo.height || 1600}
              priority={idx === 0}
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

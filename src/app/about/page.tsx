import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { AboutSlideshow } from "@/components/AboutSlideshow";
import { about } from "@/lib/mock";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <CanvasShell>
      <Header active="About" title="About" showCategoryRow={false} />
      <div className="about-layout">
        {/* 左: テキスト（スクロール） */}
        <div className="about-text">
          {/* ステートメント */}
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

          {/* CV */}
          <div
            style={{
              fontSize: "var(--font-meta)",
              letterSpacing: "0.16em",
              color: "var(--muted)",
              marginBottom: "var(--space-3)",
            }}
          >
            CV
          </div>
          <div className="hrline" />
          {about.cv.map((row, i) => (
            <div key={i}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px minmax(0, 1fr)",
                  columnGap: "var(--space-6)",
                  paddingTop: "var(--space-2)",
                  paddingBottom: "var(--space-2)",
                }}
              >
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
          ))}
        </div>

        {/* 右: スライドショー */}
        <AboutSlideshow photos={about.photos} />
      </div>
    </CanvasShell>
  );
}

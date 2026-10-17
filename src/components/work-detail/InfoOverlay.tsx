"use client";

import Link from "next/link";
import type { Work } from "@/lib/types";
import { RichBody } from "@/components/RichBody";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";

/**
 * 情報オーバーレイ: 作品詳細（タグ、説明文、詳細テーブル、お問い合わせリンク）
 */
export function InfoOverlay({
  work,
  detailOpen,
  overlayRef,
}: {
  work: Work;
  detailOpen: boolean;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" className={`work-detail-overlay${detailOpen ? " is-open" : ""}`}>
      <div className="work-detail-overlay-scroll">
        <div className="work-detail-overlay-grid">
          <div className="work-detail-overlay-content">
            {work.tags.length > 0 && (
            <div style={{ color: "var(--muted)", fontSize: "var(--font-body)" }}>
              {work.tags.map((tag, idx) => (
                <span key={`${work.slug}-${tag}-${idx}`} className="underline-active" style={{ marginRight: "var(--space-3)" }}>
                  {tag.toLowerCase()}
                </span>
              ))}
            </div>
            )}
            <RichBody
              html={work.excerpt}
              style={{ marginTop: "var(--v-heading)" }}
            />
            <div style={{ marginTop: "var(--v-heading)" }}>
              <WorkDetailsTable details={work.details} />
            </div>
            {/* Contact 導線 */}
            <div style={{ marginTop: "var(--v-section)" }}>
              <Link
                href="/contact"
                style={{
                  fontSize: "var(--font-body)",
                  color: "var(--muted)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                お問い合わせ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

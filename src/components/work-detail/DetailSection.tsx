"use client";

import Link from "next/link";
import type { Work } from "@/lib/types";
import { RichBody } from "@/components/RichBody";
import { WorkDetailsTable } from "@/components/WorkDetailsTable";

/**
 * 作品詳細セクション: ボトムバーの下に配置（左: タグ・詳細テーブル・お問い合わせリンク / 右: 説明文）
 */
export function DetailSection({
  work,
  detailRef,
}: {
  work: Work;
  detailRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section ref={detailRef} className="work-detail-section" aria-label="作品情報">
      <div className="work-detail-section-grid">
        {/* 本文（右カラム。モバイルでは先頭に表示） */}
        <div className="work-detail-section-body">
          <RichBody html={work.excerpt} />
        </div>
        {/* メタ情報（左カラム）: タグ・詳細テーブル */}
        <div className="work-detail-section-meta">
          {work.tags.length > 0 && (
            <div style={{ color: "var(--muted)", fontSize: "var(--font-body)" }}>
              {work.tags.map((tag, idx) => (
                <span key={`${work.slug}-${tag}-${idx}`} className="underline-active" style={{ marginRight: "var(--space-3)" }}>
                  {tag.toLowerCase()}
                </span>
              ))}
            </div>
          )}
          <div style={{ marginTop: "var(--v-heading)" }}>
            <WorkDetailsTable details={work.details} />
          </div>
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
    </section>
  );
}

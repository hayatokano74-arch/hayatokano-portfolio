"use client";

/**
 * Text 詳細ページ（クライアントサイドデータ取得版）
 * URL の slug に基づいて CMS API からテキストデータを取得する。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { RichBody } from "@/components/RichBody";
import type { TextPost } from "@/lib/types";
import { fetchTextsFromCms } from "@/lib/cms/text-client";
import { Header } from "./Header";
import { TextToc } from "./TextToc";

function slugFromPath(): string {
  const parts = window.location.pathname.replace(/\/+$/, "").split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

export function TextDetailPageClient() {
  const [slug, setSlug] = useState("");
  const [texts, setTexts] = useState<TextPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSlug(slugFromPath());
    fetchTextsFromCms()
      .then(setTexts)
      .catch(() => setTexts([]))
      .finally(() => setLoading(false));
  }, []);

  const post = texts.find((t) => t.slug === slug);

  if (loading) {
    return (
      <>
        <Header active="Text" title="Text" showTitleRow={false} showCategoryRow={false} />
        <div style={{ minHeight: "50vh" }} />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header active="Text" title="Text" showTitleRow={false} showCategoryRow={false} />
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--muted)" }}>
          テキストが見つかりませんでした
        </div>
      </>
    );
  }

  return (
    <>
      <Header active="Text" title="Text" showTitleRow={false} showCategoryRow={false} />
      <div className="text-detail-layout">
        {/* 左: Reading リンク（列1-2） */}
        <div className="text-detail-rail">
          <Link
            href={`/text/${post.slug}/reading`}
            className="action-link"
            style={{
              fontSize: "var(--font-body)",
              lineHeight: "var(--lh-normal)",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span>Reading</span>
            <span aria-hidden="true" style={{ fontSize: "0.95em" }}>
              ↗
            </span>
          </Link>
        </div>

        {/* 中央: 本文（列4-9、6列分） */}
        <div className="text-detail-main">
          <div
            style={{
              fontSize: "var(--font-heading)",
              lineHeight: "var(--lh-normal)",
              fontWeight: 700,
              marginBottom: "var(--v-block)",
            }}
          >
            {post.title}
          </div>
          {post.sections?.length ? (
            <div>
              {post.sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  style={{
                    scrollMarginTop: "var(--space-10)",
                    marginBottom: "var(--v-section)",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "var(--font-body)",
                      lineHeight: "var(--lh-normal)",
                      fontWeight: 700,
                      margin: "0 0 var(--v-element)",
                    }}
                  >
                    {section.heading}
                  </h2>
                  <RichBody html={section.body ?? ""} />
                </section>
              ))}
            </div>
          ) : (
            <RichBody html={post.body} />
          )}
        </div>

        {/* 右: 目次（列11-12） */}
        {post.toc ? <TextToc toc={post.toc} /> : null}
      </div>
    </>
  );
}

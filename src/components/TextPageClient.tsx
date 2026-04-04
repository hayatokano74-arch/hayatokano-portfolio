"use client";

/**
 * Text 一覧ページ（クライアントサイドデータ取得版）
 * CMS API から直接 Text を取得して表示する。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TextPost } from "@/lib/types";
import { fetchTextsFromCms } from "@/lib/cms/text-client";
import { buildCategoryMenu, parseCategory } from "@/lib/categories";
import { Header } from "./Header";

export function TextPageClient() {
  const [texts, setTexts] = useState<TextPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTextsFromCms()
      .then(setTexts)
      .catch(() => setTexts([]))
      .finally(() => setLoading(false));
  }, []);

  /* 静的エクスポート: カテゴリフィルタはクライアントサイドで処理 */
  const activeCategory = parseCategory(undefined);
  const categoryMenu = buildCategoryMenu(texts.flatMap((t) => t.categories));
  const categoryHrefs = Object.fromEntries(
    categoryMenu.map((category) => {
      const params = new URLSearchParams();
      if (category !== "All") params.set("tag", category);
      const qs = params.toString();
      return [category, qs ? `/text?${qs}` : "/text"];
    }),
  );

  if (loading) {
    return (
      <>
        <Header active="Text" title="Text" showTitleRow={false} showCategoryRow={false} />
        <div style={{ minHeight: "50vh" }} />
      </>
    );
  }

  return (
    <>
      <Header
        active="Text"
        title="Text"
        showTitleRow={false}
        activeCategory={activeCategory}
        categoryHrefs={categoryHrefs}
      />
      <div>
        {texts.map((t) => (
          <div key={t.slug}>
            <div className="hrline" />
            <Link
              href={`/text/${t.slug}`}
              className="action-link text-list-row"
            >
              <div
                className="text-list-year"
                style={{
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-normal)",
                  fontWeight: 700,
                  color: "var(--muted)",
                }}
              >
                {t.year}
              </div>
              <div
                className="text-list-title"
                style={{
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-normal)",
                  fontWeight: 700,
                }}
              >
                {t.title}
              </div>
              <div
                className="text-list-categories"
                style={{
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-normal)",
                  color: "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {t.categories.join("    ")}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

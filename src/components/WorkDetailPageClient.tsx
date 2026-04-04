"use client";

/**
 * Works 詳細ページ（クライアントサイドデータ取得版）
 * URLのslugに基づいてCMS APIから作品データを取得する。
 */

import { useEffect, useState } from "react";
import type { Work } from "@/lib/types";
import { fetchWorksFromCms } from "@/lib/cms/works-client";
import { Header } from "./Header";
import { WorkDetailClient } from "./WorkDetailClient";

function slugFromPath(): string {
  const parts = window.location.pathname.replace(/\/+$/, "").split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

export function WorkDetailPageClient() {
  const [slug, setSlug] = useState("");
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSlug(slugFromPath());
    fetchWorksFromCms()
      .then(setAllWorks)
      .catch(() => setAllWorks([]))
      .finally(() => setLoading(false));
  }, []);

  const work = allWorks.find((w) => w.slug === slug);

  if (loading) {
    return (
      <Header
        active="Works"
        title="Works"
        showTitleRow={false}
        showCategoryRow={false}
      />
    );
  }

  if (!work) {
    return (
      <>
        <Header
          active="Works"
          title="Works"
          showTitleRow={false}
          showCategoryRow={false}
        />
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--muted)" }}>
          作品が見つかりませんでした
        </div>
      </>
    );
  }

  return <WorkDetailClient work={work} allWorks={allWorks} initialSlug={slug} />;
}

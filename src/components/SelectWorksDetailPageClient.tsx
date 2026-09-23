"use client";

/**
 * Select Works 詳細ページ（非公開）
 * URLのslugに基づいてCMS APIから select_works_published=1 かつ "Client" タグの作品を取得する。
 */

import { useEffect, useState } from "react";
import type { Work } from "@/lib/types";
import { fetchSelectWorksFromCms } from "@/lib/cms/works-client";
import { SELECT_WORKS_NAV_ITEMS } from "@/lib/nav";
import { Header } from "./Header";
import { WorkDetailClient } from "./WorkDetailClient";

function slugFromPath(): string {
  const parts = window.location.pathname.replace(/\/+$/, "").split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

export function SelectWorksDetailPageClient() {
  const [slug, setSlug] = useState("");
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSlug(slugFromPath());
    fetchSelectWorksFromCms()
      .then(setAllWorks)
      .catch(() => setAllWorks([]))
      .finally(() => setLoading(false));
  }, []);

  const work = allWorks.find((w) => w.slug === slug);

  if (loading) {
    return (
      <Header
        active="Select Works"
        navItems={SELECT_WORKS_NAV_ITEMS}
        title="Select Works"
        showTitleRow={false}
        showCategoryRow={false}
      />
    );
  }

  if (!work) {
    return (
      <>
        <Header
          active="Select Works"
          navItems={SELECT_WORKS_NAV_ITEMS}
          title="Select Works"
          showTitleRow={false}
          showCategoryRow={false}
        />
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--muted)" }}>
          作品が見つかりませんでした
        </div>
      </>
    );
  }

  return <WorkDetailClient work={work} allWorks={allWorks} initialSlug={slug} basePath="/select-works" />;
}

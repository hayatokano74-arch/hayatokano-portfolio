"use client";

/**
 * Works 詳細ページ（クライアントサイドデータ取得版）
 * URLのslugに基づいてCMS APIから作品データを取得する。
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Work } from "@/lib/types";
import { fetchWorksFromCms } from "@/lib/cms/works-client";
import { Header } from "./Header";
import { WorkDetailClient } from "./WorkDetailClient";

export function WorkDetailPageClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ? decodeURIComponent(params.slug) : "";

  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

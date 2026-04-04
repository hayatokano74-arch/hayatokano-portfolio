"use client";

/**
 * 目の星 一覧ページ（クライアントサイドデータ取得版）
 */

import { useEffect, useState } from "react";
import type { MeNoHoshiPost } from "@/lib/me-no-hoshi/types";
import type { MeNoHoshiGridField } from "@/lib/me-no-hoshi/api";
import { fetchMeNoHoshiFromCms } from "@/lib/cms/me-no-hoshi-client";
import { buildFilterGroups } from "@/lib/categories";
import { Header } from "./Header";
import { FilterProvider, FilterLayout } from "./FilterableContent";
import { FilteredWorksList, FilteredCount } from "./FilteredWorksList";
import { ViewModeProvider } from "./ViewModeContext";

/** 全投稿のdetailsからグリッド表示設定を動的に生成 */
function buildGridFields(posts: MeNoHoshiPost[]): MeNoHoshiGridField[] {
  const seen = new Map<string, MeNoHoshiGridField>();
  for (const post of posts) {
    for (const d of post.details) {
      if (!seen.has(d.key)) {
        seen.set(d.key, {
          key: d.key,
          label: d.label,
          visible: d.gridVisible ?? false,
        });
      } else if (d.gridVisible) {
        /* いずれかの投稿で gridVisible なら表示する */
        seen.get(d.key)!.visible = true;
      }
    }
  }
  return Array.from(seen.values());
}

export function MeNoHoshiPageClient() {
  const [posts, setPosts] = useState<MeNoHoshiPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeNoHoshiFromCms()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const filterGroups = buildFilterGroups(
    posts.flatMap((p) => p.tags),
    posts.map((p) => p.year).filter(Boolean),
  );

  const q = "";

  if (loading) {
    return (
      <ViewModeProvider defaultView="grid">
        <Header
          active="目の星"
          title="目の星 / Menohoshi"
          showTitleRow={false}
          brandLabel="目の星"
          brandHref="/me-no-hoshi"
          showWorksToggle
        />
        <div style={{ minHeight: "50vh" }} />
      </ViewModeProvider>
    );
  }

  return (
    <ViewModeProvider defaultView="grid">
      <FilterProvider
        initialSelected={{ tags: [] as string[], years: [] as string[] }}
        basePath="/me-no-hoshi"
        currentSearchParams={{}}
        groups={filterGroups}
      >
        <Header
          active="目の星"
          title={<>目の星 / Menohoshi<FilteredCount allWorks={posts} searchQuery={q} basePath="/me-no-hoshi" /></>}
          showTitleRow={false}
          brandLabel="目の星"
          brandHref="/me-no-hoshi"
          showWorksToggle
          showFilterButton
        />
        <FilterLayout groups={filterGroups}>
          <FilteredWorksList
            allWorks={posts}
            perPage={15}
            basePath="/me-no-hoshi"
            detailQuery=""
            searchQuery={q}
            gridSettings={buildGridFields(posts)}
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

"use client";

/**
 * Works 一覧ページ（クライアントサイドデータ取得版）
 * CMS API から直接 Works を取得し、フィルタ・一覧を表示する。
 */

import { useEffect, useState } from "react";
import type { Work } from "@/lib/types";
import { fetchWorksFromCms } from "@/lib/cms/works-client";
import { buildFilterGroups } from "@/lib/categories";
import { Header } from "./Header";
import { FilterProvider, FilterLayout } from "./FilterableContent";
import { FilteredWorksList, FilteredCount } from "./FilteredWorksList";
import { ViewModeProvider } from "./ViewModeContext";

export function WorksPageClient() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorksFromCms()
      .then(setWorks)
      .catch(() => setWorks([]))
      .finally(() => setLoading(false));
  }, []);

  const filterGroups = buildFilterGroups(
    works.flatMap((w) => w.tags),
    works.map((w) => w.year).filter(Boolean),
  );

  const q = "";

  if (loading) {
    return (
      <ViewModeProvider defaultView="list">
        <Header
          active="Works"
          title="Works"
          showTitleRow={false}
          showWorksToggle
        />
        <div style={{ minHeight: "50vh" }} />
      </ViewModeProvider>
    );
  }

  return (
    <ViewModeProvider defaultView="list">
      <FilterProvider
        initialSelected={{ tags: [] as string[], years: [] as string[] }}
        basePath="/works"
        currentSearchParams={{}}
        groups={filterGroups}
      >
        <Header
          active="Works"
          title={<>Works<FilteredCount allWorks={works} searchQuery={q} basePath="/works" /></>}
          showTitleRow={false}
          showWorksToggle
          showFilterButton
        />
        <FilterLayout groups={filterGroups}>
          <FilteredWorksList
            allWorks={works}
            perPage={15}
            basePath="/works"
            searchQuery={q}
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

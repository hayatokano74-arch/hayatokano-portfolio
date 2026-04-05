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

const CMS_API = "https://hayatokano.com/_cms/api";

async function fetchPerPage(key: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(`${CMS_API}/settings.php?key=${key}`);
    const val = await res.json();
    const n = parseInt(val, 10);
    return n > 0 ? n : fallback;
  } catch { return fallback; }
}

export function WorksPageClient() {
  const [works, setWorks] = useState<Work[]>([]);
  const [perPage, setPerPage] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchWorksFromCms(), fetchPerPage('works_per_page', 6)])
      .then(([w, pp]) => { setWorks(w); setPerPage(pp); })
      .catch(() => setWorks([]))
      .finally(() => setLoading(false));
  }, []);

  const filterGroups = buildFilterGroups(
    works.flatMap((w) => w.tags),
    works.map((w) => w.year).filter(Boolean),
  );

  if (loading) {
    return (
      <ViewModeProvider storageKey="works-view" defaultView="list">
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
    <ViewModeProvider storageKey="works-view" defaultView="list">
      <FilterProvider
        initialSelected={{ tags: [] as string[], years: [] as string[] }}
        basePath="/works"
        currentSearchParams={{}}
        groups={filterGroups}
      >
        <Header
          active="Works"
          title={<>Works<FilteredCount allWorks={works} basePath="/works" /></>}
          showTitleRow={false}
          showWorksToggle
          showFilterButton
        />
        <FilterLayout groups={filterGroups}>
          <FilteredWorksList
            allWorks={works}
            perPage={perPage}
            basePath="/works"
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

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

const CMS_API = "https://hayatokano.com/_cms/api";

/** デフォルトのグリッド表示フィールド（API未設定時のフォールバック） */
const fallbackGridFields: MeNoHoshiGridField[] = [
  { key: "artist", label: "ARTIST", visible: true },
  { key: "period", label: "PERIOD", visible: true },
  { key: "open_date", label: "OPEN", visible: true },
  { key: "hours", label: "HOURS", visible: true },
  { key: "venue", label: "VENUE", visible: true },
];

/** CMS設定APIからグリッド表示設定を取得 */
async function fetchGridSettings(): Promise<MeNoHoshiGridField[]> {
  try {
    const res = await fetch(`${CMS_API}/settings.php?key=me_no_hoshi_grid_fields`);
    if (!res.ok) return fallbackGridFields;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    return fallbackGridFields;
  } catch {
    return fallbackGridFields;
  }
}

async function fetchPerPage(key: string, fallback: number): Promise<number> {
  try {
    const res = await fetch(`${CMS_API}/settings.php?key=${key}`);
    const val = await res.json();
    const n = parseInt(val, 10);
    return n > 0 ? n : fallback;
  } catch { return fallback; }
}

export function MeNoHoshiPageClient() {
  const [posts, setPosts] = useState<MeNoHoshiPost[]>([]);
  const [gridFields, setGridFields] = useState<MeNoHoshiGridField[]>(fallbackGridFields);
  const [perPage, setPerPage] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMeNoHoshiFromCms(), fetchGridSettings(), fetchPerPage('me_no_hoshi_per_page', 6)])
      .then(([p, g, pp]) => { setPosts(p); setGridFields(g); setPerPage(pp); })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const filterGroups = buildFilterGroups(
    posts.flatMap((p) => p.tags),
    posts.map((p) => p.year).filter(Boolean),
  );


  if (loading) {
    return (
      <ViewModeProvider storageKey="menohoshi-view" defaultView="grid">
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
    <ViewModeProvider storageKey="menohoshi-view" defaultView="grid">
      <FilterProvider
        initialSelected={{ tags: [] as string[], years: [] as string[] }}
        basePath="/me-no-hoshi"
        currentSearchParams={{}}
        groups={filterGroups}
      >
        <Header
          active="目の星"
          title={<>目の星 / Menohoshi<FilteredCount allWorks={posts} basePath="/me-no-hoshi" /></>}
          showTitleRow={false}
          brandLabel="目の星"
          brandHref="/me-no-hoshi"
          showWorksToggle
          showFilterButton
        />
        <FilterLayout groups={filterGroups}>
          <FilteredWorksList
            allWorks={posts}
            perPage={perPage}
            basePath="/me-no-hoshi"
            detailQuery=""
            gridSettings={gridFields}
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

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

const defaultGridFields: MeNoHoshiGridField[] = [
  { key: "artist",    label: "ARTIST",    visible: true  },
  { key: "period",    label: "PERIOD",    visible: true  },
  { key: "open_date", label: "OPEN",      visible: true  },
  { key: "hours",     label: "HOURS",     visible: true  },
  { key: "closed",    label: "CLOSED",    visible: false },
  { key: "admission", label: "ADMISSION", visible: false },
  { key: "venue",     label: "VENUE",     visible: true  },
  { key: "address",   label: "ADDRESS",   visible: false },
  { key: "access",    label: "ACCESS",    visible: false },
];

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
            gridSettings={defaultGridFields}
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

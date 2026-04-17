"use client";

import type { MeNoHoshiPost } from "@/lib/me-no-hoshi/types";
import type { MeNoHoshiGridField } from "@/lib/me-no-hoshi/api";
import { buildFilterGroups } from "@/lib/categories";
import { Header } from "./Header";
import { FilterProvider, FilterLayout } from "./FilterableContent";
import { FilteredWorksList, FilteredCount } from "./FilteredWorksList";
import { ViewModeProvider } from "./ViewModeContext";

const PER_PAGE = 6;

export function MeNoHoshiPageClient({
  posts,
  gridSettings,
}: {
  posts: MeNoHoshiPost[];
  gridSettings: MeNoHoshiGridField[];
}) {
  const filterGroups = buildFilterGroups(
    posts.flatMap((p) => p.tags),
    posts.map((p) => p.year).filter(Boolean),
  );

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
            perPage={PER_PAGE}
            basePath="/me-no-hoshi"
            detailQuery=""
            gridSettings={gridSettings}
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

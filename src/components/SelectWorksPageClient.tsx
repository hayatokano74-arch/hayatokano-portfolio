"use client";

import type { Work } from "@/lib/types";
import { buildFilterGroups } from "@/lib/categories";
import { SELECT_WORKS_NAV_ITEMS } from "@/lib/nav";
import { Header } from "./Header";
import { FilterProvider, FilterLayout } from "./FilterableContent";
import { FilteredWorksList, FilteredCount } from "./FilteredWorksList";
import { ViewModeProvider } from "./ViewModeContext";

const PER_PAGE = 12;

/** 非公開ページ: Select Works（Worksのうち "Client" タグの作品のみ） */
export function SelectWorksPageClient({ works }: { works: Work[] }) {
  const filterGroups = buildFilterGroups(
    works.flatMap((w) => w.tags),
    works.map((w) => w.year).filter(Boolean),
  );

  return (
    <ViewModeProvider storageKey="select-works-view" defaultView="list">
      <FilterProvider
        initialSelected={{ tags: [] as string[], years: [] as string[] }}
        basePath="/select-works"
        currentSearchParams={{}}
        groups={filterGroups}
      >
        <Header
          active="Select Works"
          navItems={SELECT_WORKS_NAV_ITEMS}
          title={<>Select Works<FilteredCount allWorks={works} basePath="/select-works" /></>}
          showTitleRow={false}
          showWorksToggle
          showFilterButton
        />
        <FilterLayout groups={filterGroups}>
          <FilteredWorksList
            allWorks={works}
            perPage={PER_PAGE}
            basePath="/select-works"
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

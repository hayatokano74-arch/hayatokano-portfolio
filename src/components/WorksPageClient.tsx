"use client";

import type { Work } from "@/lib/types";
import { buildFilterGroups } from "@/lib/categories";
import { Header } from "./Header";
import { FilterProvider, FilterLayout } from "./FilterableContent";
import { FilteredWorksList, FilteredCount } from "./FilteredWorksList";
import { ViewModeProvider } from "./ViewModeContext";

// 表示件数: CMS設定から移動（変更したい場合はここを編集）
const PER_PAGE = 12;

export function WorksPageClient({ works }: { works: Work[] }) {
  const filterGroups = buildFilterGroups(
    works.flatMap((w) => w.tags),
    works.map((w) => w.year).filter(Boolean),
  );

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
            perPage={PER_PAGE}
            basePath="/works"
          />
        </FilterLayout>
      </FilterProvider>
    </ViewModeProvider>
  );
}

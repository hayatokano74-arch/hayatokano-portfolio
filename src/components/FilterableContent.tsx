"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { FilterSidebar } from "@/components/FilterSidebar";
import type { FilterGroup } from "@/lib/categories";

/* フィルター開閉状態を共有するContext */
type FilterCtx = {
  filterOpen: boolean;
  onFilterToggle: () => void;
  filterCount: number;
};

const FilterContext = createContext<FilterCtx>({
  filterOpen: false,
  onFilterToggle: () => {},
  filterCount: 0,
});

/** Header等からフィルター開閉stateを参照するフック */
export function useFilterContext() {
  return useContext(FilterContext);
}

export function FilterableContent({
  groups,
  selectedTags,
  basePath,
  currentSearchParams,
  children,
}: {
  groups: FilterGroup[];
  selectedTags: string[];
  basePath: string;
  currentSearchParams: Record<string, string>;
  children: ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);

  const onFilterToggle = () => setFilterOpen((prev) => !prev);
  const onClose = () => setFilterOpen(false);

  return (
    <FilterContext.Provider
      value={{
        filterOpen,
        onFilterToggle,
        filterCount: selectedTags.length,
      }}
    >
      {/* サイドバー + コンテンツ */}
      <div className={`filter-layout ${filterOpen ? "is-open" : ""}`}>
        <FilterSidebar
          groups={groups}
          selectedTags={selectedTags}
          basePath={basePath}
          currentSearchParams={currentSearchParams}
          open={filterOpen}
          onClose={onClose}
        />
        <div className="filter-content">
          {children}
        </div>
      </div>
    </FilterContext.Provider>
  );
}

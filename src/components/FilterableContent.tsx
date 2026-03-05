"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { FilterSidebar, type SelectedFilters } from "@/components/FilterSidebar";
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

/**
 * フィルターシステムのプロバイダー。
 * Context だけを提供し、レイアウトには関与しない。
 */
export function FilterProvider({
  selected,
  children,
}: {
  selected: SelectedFilters;
  children: ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const onFilterToggle = () => setFilterOpen((prev) => !prev);

  /* 全グループの選択合計数 */
  const filterCount = Object.values(selected).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <FilterContext.Provider
      value={{ filterOpen, onFilterToggle, filterCount }}
    >
      {children}
    </FilterContext.Provider>
  );
}

/**
 * サイドバー + コンテンツのレイアウト。
 * ヘッダーの下に配置する。
 */
export function FilterLayout({
  groups,
  selected,
  basePath,
  currentSearchParams,
  children,
}: {
  groups: FilterGroup[];
  selected: SelectedFilters;
  basePath: string;
  currentSearchParams: Record<string, string>;
  children: ReactNode;
}) {
  const { filterOpen } = useFilterContext();

  return (
    <div className={`filter-layout ${filterOpen ? "is-open" : ""}`}>
      <FilterSidebarWrapper
        groups={groups}
        selected={selected}
        basePath={basePath}
        currentSearchParams={currentSearchParams}
      />
      <div className="filter-content">
        {children}
      </div>
    </div>
  );
}

/** サイドバーのラッパー（FilterContext から開閉を取得） */
function FilterSidebarWrapper({
  groups,
  selected,
  basePath,
  currentSearchParams,
}: {
  groups: FilterGroup[];
  selected: SelectedFilters;
  basePath: string;
  currentSearchParams: Record<string, string>;
}) {
  const { filterOpen, onFilterToggle } = useFilterContext();

  return (
    <FilterSidebar
      groups={groups}
      selected={selected}
      basePath={basePath}
      currentSearchParams={currentSearchParams}
      open={filterOpen}
      onClose={onFilterToggle}
    />
  );
}

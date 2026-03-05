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

/**
 * フィルターシステムのプロバイダー。
 * Context だけを提供し、レイアウトには関与しない。
 * サイドバー+コンテンツの配置は FilterLayout で行う。
 */
export function FilterProvider({
  selectedTags,
  children,
}: {
  selectedTags: string[];
  children: ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const onFilterToggle = () => setFilterOpen((prev) => !prev);

  return (
    <FilterContext.Provider
      value={{
        filterOpen,
        onFilterToggle,
        filterCount: selectedTags.length,
      }}
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
  const { filterOpen } = useFilterContext();
  const onClose = () => {
    /* Context の onFilterToggle を呼ぶ（閉じる方向） */
  };

  return (
    <div className={`filter-layout ${filterOpen ? "is-open" : ""}`}>
      <FilterSidebarWrapper
        groups={groups}
        selectedTags={selectedTags}
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
  selectedTags,
  basePath,
  currentSearchParams,
}: {
  groups: FilterGroup[];
  selectedTags: string[];
  basePath: string;
  currentSearchParams: Record<string, string>;
}) {
  const { filterOpen, onFilterToggle } = useFilterContext();

  return (
    <FilterSidebar
      groups={groups}
      selectedTags={selectedTags}
      basePath={basePath}
      currentSearchParams={currentSearchParams}
      open={filterOpen}
      onClose={onFilterToggle}
    />
  );
}

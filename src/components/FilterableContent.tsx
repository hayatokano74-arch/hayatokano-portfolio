"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { FilterSidebar, type SelectedFilters } from "@/components/FilterSidebar";
import type { FilterGroup } from "@/lib/categories";

/* フィルター開閉・選択状態を共有するContext */
type FilterCtx = {
  filterOpen: boolean;
  onFilterToggle: () => void;
  filterCount: number;
  /** 現在のフィルター選択状態（クライアント側で即時更新） */
  selected: SelectedFilters;
  /** フィルター値をトグル */
  onToggle: (paramKey: string, value: string) => void;
};

const FilterContext = createContext<FilterCtx>({
  filterOpen: false,
  onFilterToggle: () => {},
  filterCount: 0,
  selected: {},
  onToggle: () => {},
});

/** Header等からフィルター開閉stateを参照するフック */
export function useFilterContext() {
  return useContext(FilterContext);
}

/**
 * フィルターシステムのプロバイダー。
 * フィルター選択状態をクライアント側stateで管理し、URLはreplaceStateで同期。
 */
export function FilterProvider({
  initialSelected,
  basePath,
  currentSearchParams,
  groups,
  children,
}: {
  initialSelected: SelectedFilters;
  basePath: string;
  currentSearchParams: Record<string, string>;
  groups: FilterGroup[];
  children: ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedFilters>(initialSelected);
  const onFilterToggle = useCallback(() => setFilterOpen((prev) => !prev), []);

  /* フィルター値のトグル: state即更新 + URL同期（サーバー再フェッチなし） */
  const onToggle = useCallback((paramKey: string, value: string) => {
    setSelected((prev) => {
      const current = prev[paramKey] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      const newSelected = { ...prev, [paramKey]: next };

      /* URLをreplaceStateで同期 */
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(currentSearchParams)) {
        if (!["tags", "tag", "years", "page"].includes(k)) params.set(k, v);
      }
      for (const group of groups) {
        const vals = newSelected[group.paramKey] ?? [];
        if (vals.length > 0) params.set(group.paramKey, vals.join(","));
      }
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `${basePath}?${qs}` : basePath);

      return newSelected;
    });
  }, [basePath, currentSearchParams, groups]);

  const filterCount = useMemo(
    () => Object.values(selected).reduce((sum, arr) => sum + arr.length, 0),
    [selected],
  );

  const ctx = useMemo(() => ({
    filterOpen,
    onFilterToggle,
    filterCount,
    selected,
    onToggle,
  }), [filterOpen, onFilterToggle, filterCount, selected, onToggle]);

  return (
    <FilterContext.Provider value={ctx}>
      {children}
    </FilterContext.Provider>
  );
}

/**
 * フィルタードロップダウン + コンテンツのレイアウト。
 */
export function FilterLayout({
  groups,
  children,
}: {
  groups: FilterGroup[];
  children: ReactNode;
}) {
  const { filterOpen, onFilterToggle, selected, onToggle } = useFilterContext();

  return (
    <div className="filter-layout">
      <FilterSidebar
        groups={groups}
        selected={selected}
        open={filterOpen}
        onClose={onFilterToggle}
        onToggle={onToggle}
      />
      <div className="filter-content">
        {children}
      </div>
    </div>
  );
}

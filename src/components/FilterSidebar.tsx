"use client";

import type { FilterGroup } from "@/lib/categories";

/** 各グループの選択状態: { tags: ["Video"], years: ["2021"] } */
export type SelectedFilters = Record<string, string[]>;

/**
 * フィルタードロップダウン: 検索バーの直下に展開するインラインパネル。
 * 12カラムグリッドに沿ってフィルターグループを横並びに配置。
 */
export function FilterSidebar({
  groups,
  selected,
  open,
  onToggle,
}: {
  groups: FilterGroup[];
  selected: SelectedFilters;
  open: boolean;
  onClose: () => void;
  /** フィルター値をトグル（クライアント側stateを即座に更新） */
  onToggle: (paramKey: string, value: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="filter-dropdown">
      {/* フィルターグループ: 12カラムグリッドで横並び */}
      <div className="filter-dropdown-grid">
        {groups.map((group) => (
          <FilterColumn
            key={group.paramKey}
            group={group}
            selectedValues={selected[group.paramKey] ?? []}
            onToggle={(value) => onToggle(group.paramKey, value)}
          />
        ))}
      </div>
    </div>
  );
}

/* フィルターカラム（アコーディオンなし、常に展開） */
function FilterColumn({
  group,
  selectedValues,
  onToggle,
}: {
  group: FilterGroup;
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="filter-dropdown-column">
      <div className="filter-dropdown-label">{group.label}</div>
      <div className="filter-dropdown-options">
        {group.options.map((opt) => (
          <label key={opt.value} className="filter-option">
            <input
              type="checkbox"
              checked={selectedValues.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="filter-checkbox"
            />
            <span className="filter-option-label">{opt.value}</span>
            <span className="filter-option-count">({opt.count})</span>
          </label>
        ))}
      </div>
    </div>
  );
}

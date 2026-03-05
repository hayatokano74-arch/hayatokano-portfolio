"use client";

import { useRouter } from "next/navigation";
import type { FilterGroup } from "@/lib/categories";

/** 各グループの選択状態: { tags: ["Video"], years: ["2021"] } */
export type SelectedFilters = Record<string, string[]>;

/** フィルターパラメータキーの一覧 */
const FILTER_PARAM_KEYS = ["tags", "tag", "years"];

/**
 * フィルタードロップダウン: 検索バーの直下に展開するインラインパネル。
 * 12カラムグリッドに沿ってフィルターグループを横並びに配置。
 */
export function FilterSidebar({
  groups,
  selected,
  basePath,
  currentSearchParams,
  open,
}: {
  groups: FilterGroup[];
  selected: SelectedFilters;
  basePath: string;
  currentSearchParams: Record<string, string>;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  /* 選択中の合計数 */
  const totalSelected = Object.values(selected).reduce((sum, arr) => sum + arr.length, 0);

  /* 特定グループ内の値をトグル → URLを更新 */
  const toggleValue = (paramKey: string, value: string) => {
    const current = selected[paramKey] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const params = new URLSearchParams();
    /* フィルター以外のパラメータ（view, q等）を維持 */
    for (const [k, v] of Object.entries(currentSearchParams)) {
      if (!FILTER_PARAM_KEYS.includes(k)) params.set(k, v);
    }
    /* 全グループの選択状態を反映 */
    for (const group of groups) {
      const vals = group.paramKey === paramKey ? next : (selected[group.paramKey] ?? []);
      if (vals.length > 0) params.set(group.paramKey, vals.join(","));
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  /* 全クリア */
  const clearAll = () => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(currentSearchParams)) {
      if (!FILTER_PARAM_KEYS.includes(k)) params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

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
            onToggle={(value) => toggleValue(group.paramKey, value)}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FilterGroup } from "@/lib/categories";
import { buildTagsParam } from "@/lib/categories";

export function FilterSidebar({
  groups,
  selectedTags,
  basePath,
  currentSearchParams,
  open,
  onClose,
}: {
  groups: FilterGroup[];
  selectedTags: string[];
  basePath: string;
  currentSearchParams: Record<string, string>;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  /* タグの選択・解除 → URLを更新 */
  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    const params = new URLSearchParams();
    /* 既存パラメータ（view, q等）を維持 */
    for (const [k, v] of Object.entries(currentSearchParams)) {
      if (k !== "tags" && k !== "tag") params.set(k, v);
    }
    const tagsParam = buildTagsParam(next);
    if (tagsParam) params.set("tags", next.join(","));
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  /* 全クリア */
  const clearAll = () => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(currentSearchParams)) {
      if (k !== "tags" && k !== "tag") params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return (
    <>
      {/* モバイルオーバーレイ背景 */}
      {open && (
        <div
          className="filter-overlay-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`filter-sidebar ${open ? "is-open" : ""}`}
        aria-label="フィルター"
      >
        {/* モバイル用ヘッダー */}
        <div className="filter-sidebar-header">
          <span className="filter-sidebar-title">Filters</span>
          <button
            type="button"
            className="filter-sidebar-close"
            onClick={onClose}
            aria-label="フィルターを閉じる"
          >
            ×
          </button>
        </div>

        {/* クリアリンク */}
        {selectedTags.length > 0 && (
          <button
            type="button"
            className="filter-clear-all"
            onClick={clearAll}
          >
            Clear all
          </button>
        )}

        {/* フィルターグループ */}
        {groups.map((group) => (
          <FilterAccordion
            key={group.label}
            group={group}
            selectedTags={selectedTags}
            onToggle={toggleTag}
          />
        ))}
      </aside>
    </>
  );
}

/* アコーディオングループ */
function FilterAccordion({
  group,
  selectedTags,
  onToggle,
}: {
  group: FilterGroup;
  selectedTags: string[];
  onToggle: (tag: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="filter-group">
      <button
        type="button"
        className="filter-group-header"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span>{group.label}</span>
        <span className="filter-chevron">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="filter-group-options">
          {group.options.map((opt) => {
            const checked = selectedTags.includes(opt.value);
            return (
              <label key={opt.value} className="filter-option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(opt.value)}
                  className="filter-checkbox"
                />
                <span className="filter-option-label">{opt.value}</span>
                <span className="filter-option-count">({opt.count})</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import React, { Suspense } from "react";
import { type Category } from "@/lib/categories";
import { useFilterContext } from "@/components/FilterableContent";
import { SearchInput, SearchPlaceholder } from "./SearchBar";

import { ViewToggleLinks } from "./ViewToggleLinks";
import { ChevronIcon } from "./icons";

type CategoryRowProps = {
  showFilterButton: boolean;
  showSearch: boolean;
  showWorksToggle: boolean;
  activeCategory: Category;
  categoryHrefs?: Partial<Record<Category, string>>;
};

/**
 * カテゴリ行: フィルターモードと従来モードを切り替え
 */
export function CategoryRow({
  showFilterButton,
  showSearch,
  showWorksToggle,
  activeCategory,
  categoryHrefs,
}: CategoryRowProps) {
  return (
    <div className={`header-category-row ${showFilterButton ? "is-filter-mode" : ""}`}>
      {showFilterButton ? (
        <FilterModeBar
          showSearch={showSearch}
          showWorksToggle={showWorksToggle}
        />
      ) : (
        <ClassicModeBar
          categoryHrefs={categoryHrefs}
          activeCategory={activeCategory}
          showWorksToggle={showWorksToggle}
          showSearch={showSearch}
        />
      )}
    </div>
  );
}

/* ── フィルターモード: 検索 + フィルター + Grid/List ── */

type FilterModeBarProps = {
  showSearch: boolean;
  showWorksToggle: boolean;
};

function FilterModeBar({
  showSearch,
  showWorksToggle,
}: FilterModeBarProps) {
  const { filterOpen, onFilterToggle, filterCount } = useFilterContext();

  return (
    <div className="header-filter-search">
      {showSearch ? (
        <Suspense fallback={<SearchPlaceholder />}>
          <SearchInput />
        </Suspense>
      ) : null}

      <div className="filter-bar-tools">
        <button
          type="button"
          className={`filter-search-trigger ${filterOpen ? "is-open" : ""}`}
          onClick={onFilterToggle}
          aria-expanded={filterOpen}
          aria-label="フィルターを開閉"
        >
          <span className="filter-trigger-label">
            Filter{filterCount > 0 && <span className="filter-trigger-count"> ({filterCount})</span>}
          </span>
          <span className={`filter-trigger-chevron ${filterOpen ? "is-open" : ""}`} aria-hidden="true">
            <ChevronIcon />
          </span>
        </button>

        {showWorksToggle ? (
          <>
            <span className="filter-bar-separator" aria-hidden="true" />
            <ViewToggleLinks />
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ── 従来モード: カテゴリリンク + Grid/List + 検索 ── */

type ClassicModeBarProps = {
  categoryHrefs?: Partial<Record<Category, string>>;
  activeCategory: Category;
  showWorksToggle: boolean;
  showSearch: boolean;
};

function ClassicModeBar({
  categoryHrefs,
  activeCategory,
  showWorksToggle,
  showSearch,
}: ClassicModeBarProps) {
  return (
    <>
      <div className="header-category-links">
        {Object.keys(categoryHrefs ?? {}).filter((item) => categoryHrefs?.[item]).map((item) => {
          const className = item === activeCategory ? "underline-active" : "";
          const style = { color: item === activeCategory ? "var(--fg)" : "var(--muted)" } as const;
          const href = categoryHrefs![item]!;
          return (
            <Link key={item} href={href} className={`${className} action-link`.trim()} style={style}>
              {item}
            </Link>
          );
        })}
      </div>

      {showWorksToggle ? (
        <div className="works-view-toggle">
          <ViewToggleLinks />
        </div>
      ) : null}

      {showSearch ? (
        <Suspense fallback={<SearchPlaceholder />}>
          <SearchInput />
        </Suspense>
      ) : null}
    </>
  );
}

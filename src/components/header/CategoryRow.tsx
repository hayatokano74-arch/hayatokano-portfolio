"use client";

import Link from "next/link";
import React, { Suspense } from "react";
import { type Category } from "@/lib/categories";
import { useFilterContext } from "@/components/FilterableContent";
import { SearchInput, SearchPlaceholder } from "./SearchBar";
import { FilterIcon } from "./icons";
import { ViewToggleLinks } from "./ViewToggleLinks";

type CategoryRowProps = {
  showFilterButton: boolean;
  showSearch: boolean;
  showWorksToggle: boolean;
  worksView: "grid" | "list";
  worksGridHref: string;
  worksListHref: string;
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
  worksView,
  worksGridHref,
  worksListHref,
  activeCategory,
  categoryHrefs,
}: CategoryRowProps) {
  const { filterOpen, onFilterToggle, filterCount } = useFilterContext();
  const view = worksView;

  return (
    <div className={`header-category-row ${showFilterButton ? "is-filter-mode" : ""}`}>
      {showFilterButton ? (
        <FilterModeBar
          showSearch={showSearch}
          filterOpen={filterOpen}
          onFilterToggle={onFilterToggle}
          filterCount={filterCount}
          showWorksToggle={showWorksToggle}
          view={view}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
        />
      ) : (
        <ClassicModeBar
          categoryHrefs={categoryHrefs}
          activeCategory={activeCategory}
          showWorksToggle={showWorksToggle}
          view={view}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
          showSearch={showSearch}
        />
      )}
    </div>
  );
}

/* ── フィルターモード: 検索 + フィルター + Grid/List ── */

type FilterModeBarProps = {
  showSearch: boolean;
  filterOpen: boolean;
  onFilterToggle: () => void;
  filterCount: number;
  showWorksToggle: boolean;
  view: "grid" | "list";
  worksGridHref: string;
  worksListHref: string;
};

function FilterModeBar({
  showSearch,
  filterOpen,
  onFilterToggle,
  filterCount,
  showWorksToggle,
  view,
  worksGridHref,
  worksListHref,
}: FilterModeBarProps) {
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
          <FilterIcon />
          {filterCount > 0 && <span className="filter-badge" />}
        </button>

        {showWorksToggle ? (
          <>
            <span className="filter-bar-separator" aria-hidden="true" />
            <ViewToggleLinks
              view={view}
              gridHref={worksGridHref}
              listHref={worksListHref}
            />
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
  view: "grid" | "list";
  worksGridHref: string;
  worksListHref: string;
  showSearch: boolean;
};

function ClassicModeBar({
  categoryHrefs,
  activeCategory,
  showWorksToggle,
  view,
  worksGridHref,
  worksListHref,
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
          <ViewToggleLinks
            view={view}
            gridHref={worksGridHref}
            listHref={worksListHref}
          />
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


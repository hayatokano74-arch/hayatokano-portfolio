"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type Category } from "@/lib/categories";
import { NAV_ITEMS, type Section } from "@/lib/nav";
import { ThemeDot } from "@/components/ThemeToggle";
import { useFilterContext } from "@/components/FilterableContent";

type HeaderTitle = "Works" | "Text" | "目の星" | "Time Line" | "Garden" | "News" | "About" | "Contact" | (string & {});

export function Header({
  active,
  title,
  brandLabel = "Hayato Kano",
  brandHref = "/",
  showTitleRow = true,
  showWorksToggle = false,
  worksView = "grid",
  worksGridHref = "/works?view=grid",
  worksListHref = "/works?view=list",
  showCategoryRow = true,
  showSearch = true,
  activeCategory = "Video",
  categoryHrefs,
  titleRight,
  /* フィルターモード用 */
  showFilterButton = false,
}: {
  active: Section;
  title: HeaderTitle;
  brandLabel?: string;
  brandHref?: string;
  showTitleRow?: boolean;
  showWorksToggle?: boolean;
  worksView?: "grid" | "list";
  worksGridHref?: string;
  worksListHref?: string;
  showCategoryRow?: boolean;
  showSearch?: boolean;
  activeCategory?: Category;
  categoryHrefs?: Partial<Record<Category, string>>;
  titleRight?: React.ReactNode;
  /* フィルターモード用 */
  showFilterButton?: boolean;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const view = worksView;
  const { filterOpen, onFilterToggle, filterCount } = useFilterContext();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="header-root">
      {/* ── メインヘッダーバー ── */}
      <div className="header-bar">
        {/* 左: ブランド名 */}
        <Link href={brandHref} className="header-brand-name">
          {brandLabel === "Hayato Kano" ? "HAYATO KANO" : brandLabel}
        </Link>

        {/* モバイルメニューボタン: ＋ → × 回転 */}
        <button
          type="button"
          className={`mobile-menu-button ${mobileMenuOpen ? "is-open" : ""}`}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-main-menu"
          aria-label={mobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span className="mobile-menu-icon" />
        </button>

        {/* テーマ切替ドット: ブランドとナビの間 */}
        <ThemeDot />

        {/* デスクトップナビ: ナンバリング付き */}
        <nav className="desktop-main-nav">
          {NAV_ITEMS.map(({ num, label, href, section }) => (
            <Link
              key={section}
              href={href}
              className={`header-nav-item ${active === section ? "is-active" : ""}`}
            >
              <span className="header-nav-num">{num}</span>
              <span className="header-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
      </div>


      {/* ── モバイルフルスクリーンメニュー ── */}
      {mobileMenuOpen ? (
        <div className="mobile-overlay">
          <nav id="mobile-main-menu" className="mobile-overlay-nav">
            {NAV_ITEMS.map(({ num, label, href, section }) => (
              <Link
                key={section}
                href={href}
                className={`mobile-nav-item ${active === section ? "is-active" : ""}`}
              >
                <span className="mobile-nav-num">{num}</span>
                <span className="mobile-nav-label">{label}</span>
              </Link>
            ))}
            <div style={{ marginTop: "var(--space-7)" }}>
              <ThemeDot />
            </div>
            <div className="mobile-menu-footer">
              <div className="mobile-menu-footer-links">
                <a href="mailto:info@hayatokano.com" className="mobile-menu-footer-link">
                  info@hayatokano.com
                </a>
                <a
                  href="https://www.instagram.com/_hayatokano/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-menu-footer-link"
                >
                  Instagram
                </a>
                <a
                  href="https://x.com/_oshica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-menu-footer-link"
                >
                  X
                </a>
              </div>
              <span className="mobile-menu-footer-copy">© {new Date().getFullYear()} Hayato Kano</span>
            </div>
          </nav>
        </div>
      ) : null}

      {/* ── タイトル行（12カラムグリッド） ── */}
      {showTitleRow || titleRight ? (
        <div className="header-title-row">
          <div className="header-title-left">
            {showTitleRow ? (
              <h1 className="page-title">{title}</h1>
            ) : null}
          </div>

          {titleRight ? (
            <div className="header-title-right">{titleRight}</div>
          ) : null}
        </div>
      ) : null}

      {/* ── カテゴリ行（12カラムグリッド） ── */}
      {showCategoryRow ? (
        <div className={`header-category-row ${showFilterButton ? "is-filter-mode" : ""}`}>
          {/* フィルターモード: フィルターアイコン統合検索バー + Grid/List */}
          {showFilterButton ? (
            <>
              <div className="header-filter-search">
                {/* フィルターアイコン: 検索バー左端に統合 */}
                <button
                  type="button"
                  className={`filter-search-trigger ${filterOpen ? "is-open" : ""}`}
                  onClick={onFilterToggle}
                  aria-expanded={filterOpen}
                  aria-label="フィルターを開閉"
                >
                  {/* スライダーアイコン（調整/フィルター） */}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="5" cy="4" r="1.5" fill="currentColor" />
                    <circle cx="11" cy="8" r="1.5" fill="currentColor" />
                    <circle cx="7" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                  {filterCount > 0 && <span className="filter-badge" />}
                </button>

                {/* 検索入力 */}
                {showSearch ? (
                  <Suspense fallback={<SearchPlaceholder />}>
                    <SearchInput />
                  </Suspense>
                ) : null}
              </div>

              {showWorksToggle ? (
                <div className="works-view-toggle">
                  <Link
                    href={worksGridHref}
                    className={`view-toggle-seg ${view === "grid" ? "is-active" : ""}`}
                    aria-label="グリッド表示"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
                      <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
                      <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
                      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
                    </svg>
                  </Link>
                  <Link
                    href={worksListHref}
                    className={`view-toggle-seg ${view === "list" ? "is-active" : ""}`}
                    aria-label="リスト表示"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="2" width="14" height="2" rx="0.5" fill="currentColor" />
                      <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor" />
                      <rect x="1" y="12" width="14" height="2" rx="0.5" fill="currentColor" />
                    </svg>
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            /* 従来モード: カテゴリリンク + Grid/List + 検索 */
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
                  <Link
                    href={worksGridHref}
                    className={`view-toggle-seg ${view === "grid" ? "is-active" : ""}`}
                    aria-label="グリッド表示"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
                      <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
                      <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
                      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
                    </svg>
                  </Link>
                  <Link
                    href={worksListHref}
                    className={`view-toggle-seg ${view === "list" ? "is-active" : ""}`}
                    aria-label="リスト表示"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="2" width="14" height="2" rx="0.5" fill="currentColor" />
                      <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor" />
                      <rect x="1" y="12" width="14" height="2" rx="0.5" fill="currentColor" />
                    </svg>
                  </Link>
                </div>
              ) : null}

              {showSearch ? (
                <Suspense fallback={<SearchPlaceholder />}>
                  <SearchInput />
                </Suspense>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </header>
  );
}

const searchInputStyle = {
  width: "100%",
  border: 0,
  background: "transparent",
  fontSize: "var(--font-body)",
  lineHeight: "var(--lh-normal)",
  color: "var(--fg)",
  padding: 0,
  outline: "none",
  fontFamily: "inherit",
} as const;

function SearchPlaceholder() {
  return (
    <div className="header-search">
      <div style={{ ...searchInputStyle, color: "var(--muted)" }}>search</div>
    </div>
  );
}

function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [query, setQuery] = useState(sp.get("q") ?? "");

  useEffect(() => {
    setQuery(sp.get("q") ?? "");
  }, [sp]);

  const commit = useCallback((value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, sp]);

  return (
    <div className="header-search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(query);
        }}
        onBlur={() => commit(query)}
        placeholder="search"
        aria-label="作品を検索"
        style={searchInputStyle}
      />
    </div>
  );
}

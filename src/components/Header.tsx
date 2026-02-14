"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_MENU, type Category } from "@/lib/categories";
import { ThemeDot } from "@/components/ThemeToggle";

type Section = "Works" | "Text" | "目の星" | "Time Line" | "News" | "About" | "Contact";
type HeaderTitle = "Works" | "Text" | "目の星" | "Time Line" | "News" | "About" | "Contact";

/* ナビゲーション項目（ナンバリング付き） */
const NAV_ITEMS: { num: string; label: string; href: string; section: Section }[] = [
  { num: "01", label: "Works", href: "/works", section: "Works" },
  { num: "02", label: "Text", href: "/text", section: "Text" },
  { num: "03", label: "目の星", href: "/me-no-hoshi", section: "目の星" },
  { num: "04", label: "Time Line", href: "/timeline", section: "Time Line" },
  { num: "05", label: "News", href: "/news", section: "News" },
  { num: "06", label: "About", href: "/about", section: "About" },
  { num: "07", label: "Contact", href: "/contact", section: "Contact" },
];

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
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const view = worksView;

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
          </nav>
        </div>
      ) : null}

      {/* ── タイトル行（12カラムグリッド） ── */}
      {showTitleRow ? (
        <div className="header-title-row">
          <div className="header-title-left" style={{ gap: "var(--space-7)" }}>
            <div style={{ fontSize: "var(--font-heading)", lineHeight: 1, fontWeight: 700 }}>{title}</div>

            {showWorksToggle ? (
              <div className="works-view-toggle" style={{ gap: "var(--space-4)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 500 }}>
                <Link
                  href={worksGridHref}
                  className={`${view === "grid" ? "underline-active" : ""} action-link`.trim()}
                  style={{ color: view === "grid" ? "var(--fg)" : "var(--muted)" }}
                >
                  Grid
                </Link>
                <Link
                  href={worksListHref}
                  className={`${view === "list" ? "underline-active" : ""} action-link`.trim()}
                  style={{ color: view === "list" ? "var(--fg)" : "var(--muted)" }}
                >
                  List
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        showWorksToggle ? (
          <div className="header-title-row">
            <div className="header-title-left" style={{ gap: "var(--space-7)" }}>
              <div className="works-view-toggle" style={{ gap: "var(--space-4)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 500 }}>
                <Link
                  href={worksGridHref}
                  className={`${view === "grid" ? "underline-active" : ""} action-link`.trim()}
                  style={{ color: view === "grid" ? "var(--fg)" : "var(--muted)" }}
                >
                  Grid
                </Link>
                <Link
                  href={worksListHref}
                  className={`${view === "list" ? "underline-active" : ""} action-link`.trim()}
                  style={{ color: view === "list" ? "var(--fg)" : "var(--muted)" }}
                >
                  List
                </Link>
              </div>
            </div>
          </div>
        ) : null
      )}

      {/* ── カテゴリ行（12カラムグリッド） ── */}
      {showCategoryRow ? (
        <div className="header-category-row">
          <div className="header-category-links" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 500 }}>
            {CATEGORY_MENU.map((item) => {
              const className = item === activeCategory ? "underline-active" : "";
              const style = { color: item === activeCategory ? "var(--fg)" : "var(--muted)" } as const;
              const href = categoryHrefs?.[item];
              if (!href) {
                return (
                  <span key={item} className={className} style={style}>
                    {item}
                  </span>
                );
              }
              return (
                <Link key={item} href={href} className={`${className} action-link`.trim()} style={style}>
                  {item}
                </Link>
              );
            })}
          </div>

          {showSearch ? (
            <Suspense fallback={<SearchPlaceholder />}>
              <SearchInput />
            </Suspense>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

const searchInputStyle = {
  width: "100%",
  border: 0,
  borderBottom: "1px solid var(--line)",
  background: "transparent",
  fontSize: "var(--font-meta)",
  lineHeight: "var(--lh-normal)",
  color: "var(--fg)",
  padding: 0,
  outline: "none",
  fontFamily: "inherit",
} as const;

function SearchPlaceholder() {
  return (
    <div className="header-search" style={{ width: 140 }}>
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
    <div className="header-search" style={{ width: 140 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(query);
        }}
        onBlur={() => commit(query)}
        placeholder="search"
        style={searchInputStyle}
      />
    </div>
  );
}

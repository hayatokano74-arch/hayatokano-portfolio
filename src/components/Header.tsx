"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORY_MENU, type Category } from "@/lib/categories";

type Section = "Works" | "Text" | "目の星" | "Time Line" | "News" | "About" | "Contact";
type HeaderTitle = "Works" | "Text" | "目の星" | "Time Line" | "News" | "About" | "Contact";

/* ナビゲーション項目の定義 */
const NAV_ITEMS: { label: string; href: string; section: Section }[] = [
  { label: "Works", href: "/works", section: "Works" },
  { label: "Text", href: "/text", section: "Text" },
  { label: "目の星", href: "/me-no-hoshi", section: "目の星" },
  { label: "Time Line", href: "/timeline", section: "Time Line" },
  { label: "News", href: "/news", section: "News" },
  { label: "About", href: "/about", section: "About" },
  { label: "Contact", href: "/contact", section: "Contact" },
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
    <header>
      <div className="site-brand-row">
        {/* 左: ブランド + サブテキスト */}
        <div className="site-brand-group">
          <Link
            href={brandHref}
            className="site-brand"
            style={{ color: "var(--fg)" }}
          >
            {brandLabel}
          </Link>
          <span className="site-brand-sub">Photographer</span>
        </div>

        {/* モバイルメニューボタン */}
        <button
          type="button"
          className="action-link mobile-menu-button"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-main-menu"
          onClick={() => setMobileMenuOpen((open) => !open)}
          style={{ fontSize: "var(--font-body)", lineHeight: 1, fontWeight: 700, border: 0, background: "transparent", padding: 0 }}
        >
          {mobileMenuOpen ? "close" : "menu"}
        </button>

        {/* デスクトップナビ */}
        <nav className="desktop-main-nav">
          {NAV_ITEMS.map(({ label, href, section }) => (
            <Link
              key={section}
              href={href}
              className={`header-nav-link ${active === section ? "is-active" : ""}`.trim()}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* モバイルメニュー */}
      {mobileMenuOpen ? (
        <nav
          id="mobile-main-menu"
          className="mobile-main-menu"
          style={{
            marginTop: "var(--space-6)",
            display: "grid",
            justifyItems: "end",
            gap: "var(--space-4)",
          }}
        >
          {NAV_ITEMS.map(({ label, href, section }) => (
            <Link
              key={section}
              href={href}
              className={`header-nav-link ${active === section ? "is-active" : ""}`.trim()}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}

      {showTitleRow ? (
        <div className="header-title-row flex items-center justify-between" style={{ marginTop: "var(--space-13)", minHeight: "var(--space-10)" }}>
          <div className="header-title-left flex items-center" style={{ gap: "var(--space-7)" }}>
            <div style={{ fontSize: "var(--font-heading)", lineHeight: 1, fontWeight: 700 }}>{title}</div>

            {showWorksToggle ? (
              <div className="flex items-center" style={{ gap: "var(--space-4)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 500 }}>
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
          <div className="header-title-row flex items-center justify-between" style={{ marginTop: "var(--space-13)", minHeight: "var(--space-10)" }}>
            <div className="header-title-left flex items-center" style={{ gap: "var(--space-7)" }}>
              <div className="flex items-center" style={{ gap: "var(--space-4)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 500 }}>
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

      {showCategoryRow ? (
        <div className="header-category-row flex items-end justify-between" style={{ marginTop: "var(--space-9)", minHeight: "var(--space-8)" }}>
          <div className="header-category-links flex items-center" style={{ gap: "var(--space-6)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 500 }}>
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
  padding: "0 0 2px 0",
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

"use client";

import Link from "next/link";
import React, { useRef, useLayoutEffect } from "react";
import { type Category } from "@/lib/categories";
import { type Section } from "@/lib/nav";
import { ThemeDot } from "@/components/ThemeToggle";
import { useMobileMenu } from "@/hooks/useMobileMenu";
import { DesktopNav } from "@/components/header/DesktopNav";
import { MobileMenuButton, MobileMenuOverlay } from "@/components/header/MobileMenu";
import { CategoryRow } from "@/components/header/CategoryRow";
import { MenohoshiLogo } from "@/components/header/icons";

type HeaderTitle = React.ReactNode;

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
  showFilterButton?: boolean;
}) {
  const { isOpen: mobileMenuOpen, toggle: toggleMobileMenu } = useMobileMenu();

  /* タイトルが折り返す場合のみフォントサイズを縮小（最小24px） */
  const titleRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const MIN_SIZE = 24;
    const fit = () => {
      el.style.fontSize = ""; // CSSの値にリセット
      let size = parseFloat(getComputedStyle(el).fontSize);
      // scrollHeight > size * 1.5 → 2行以上に折り返している（line-height: 1 前提）
      while (el.scrollHeight > size * 1.5 && size > MIN_SIZE) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [title]);

  return (
    <header className="header-root">
      {/* ── メインヘッダーバー ── */}
      <div className="header-bar">
        {/* 左: ブランド名 */}
        <Link href={brandHref} className="header-brand-name">
          {brandLabel === "目の星 menohoshi" ? (
            <MenohoshiLogo />
          ) : brandLabel === "目の星" ? (
            <>
              <MenohoshiLogo />
              <span className="header-brand-sep header-brand-mnh-text" />
              <span className="header-brand-mnh-text">目の星</span>
            </>
          ) : (
            brandLabel === "Hayato Kano" ? "HAYATO KANO" : brandLabel
          )}
        </Link>

        {/* モバイルメニューボタン */}
        <MobileMenuButton isOpen={mobileMenuOpen} onToggle={toggleMobileMenu} />

        {/* テーマ切替ドット */}
        <ThemeDot />

        {/* デスクトップナビ */}
        <DesktopNav active={active} />
      </div>

      {/* ── モバイルフルスクリーンメニュー ── */}
      <MobileMenuOverlay isOpen={mobileMenuOpen} active={active} />

      {/* ── タイトル行（12カラムグリッド） ── */}
      {showTitleRow || titleRight ? (
        <div className="header-title-row">
          <div className="header-title-left">
            {showTitleRow ? (
              <h1 ref={titleRef} className="page-title">{title}</h1>
            ) : null}
          </div>

          {titleRight ? (
            <div className="header-title-right">{titleRight}</div>
          ) : null}
        </div>
      ) : null}

      {/* ── カテゴリ行（12カラムグリッド） ── */}
      {showCategoryRow ? (
        <CategoryRow
          showFilterButton={showFilterButton}
          showSearch={showSearch}
          showWorksToggle={showWorksToggle}
          worksView={worksView}
          worksGridHref={worksGridHref}
          worksListHref={worksListHref}
          activeCategory={activeCategory}
          categoryHrefs={categoryHrefs}
        />
      ) : null}
    </header>
  );
}

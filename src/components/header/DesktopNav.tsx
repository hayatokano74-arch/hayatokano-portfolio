"use client";

import Link from "next/link";
import { NAV_ITEMS, type Section } from "@/lib/nav";

type DesktopNavProps = {
  active: Section;
};

/**
 * デスクトップナビゲーション: ナンバリング付きリンク一覧
 */
export function DesktopNav({ active }: DesktopNavProps) {
  return (
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
  );
}

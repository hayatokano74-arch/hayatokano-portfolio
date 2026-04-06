"use client";

import Link from "next/link";
import React from "react";
import { NAV_ITEMS, type Section } from "@/lib/nav";
import { ThemeDot } from "@/components/ThemeToggle";

type MobileMenuButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
};

/**
 * モバイルメニューボタン: ＋ → × 回転アニメーション
 */
export function MobileMenuButton({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      className={`mobile-menu-button ${isOpen ? "is-open" : ""}`}
      aria-expanded={isOpen}
      aria-controls="mobile-main-menu"
      aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
      onClick={onToggle}
    >
      <span className="mobile-menu-icon" />
    </button>
  );
}

type MobileMenuOverlayProps = {
  isOpen: boolean;
  active: Section;
};

/**
 * モバイルフルスクリーンメニュー: ナビリンク一覧 + テーマ切替
 */
export function MobileMenuOverlay({ isOpen, active }: MobileMenuOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="mobile-overlay">
      <nav id="mobile-main-menu" className="mobile-overlay-nav">
        {NAV_ITEMS.map(({ num, label, href, section }, i) => (
          <React.Fragment key={section}>
            {i > 0 && <div className="mobile-nav-line" />}
            <Link
              href={href}
              className={`mobile-nav-item ${active === section ? "is-active" : ""}`}
            >
              <span className="mobile-nav-num">{num}</span>
              <span className="mobile-nav-label">{label}</span>
            </Link>
          </React.Fragment>
        ))}
        <div style={{ marginTop: "auto", paddingTop: "var(--space-4)" }}>
          <ThemeDot />
        </div>
      </nav>
    </div>
  );
}

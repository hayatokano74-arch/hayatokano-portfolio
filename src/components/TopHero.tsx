"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";

/* ── 型定義 ── */
type LatestWork = {
  title: string;
  year: string;
  href: string;
  image: string | null;
};

type Props = {
  candidates: string[];
  latestWorks: LatestWork[];
};

/* ── ナビ項目 ── */
const NAV_ITEMS = [
  { num: "01", label: "Works", href: "/works" },
  { num: "02", label: "Text", href: "/text" },
  { num: "03", label: "目の星", href: "/me-no-hoshi" },
  { num: "04", label: "Time Line", href: "/timeline" },
  { num: "05", label: "News", href: "/news" },
  { num: "06", label: "About", href: "/about" },
  { num: "07", label: "Contact", href: "/contact" },
];

export function TopHero({ candidates, latestWorks }: Props) {
  const [index, setIndex] = useState(0);
  const defaultSrc = useMemo(() => candidates[index] ?? null, [candidates, index]);
  const [loaded, setLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ── Works ホバーで背景切替 ── */
  const [hoverSrc, setHoverSrc] = useState<string | null>(null);
  const [hoverVisible, setHoverVisible] = useState(false);

  const handleWorkHover = useCallback((image: string | null) => {
    if (image) {
      setHoverSrc(image);
      setHoverVisible(true);
    }
  }, []);

  const handleWorkLeave = useCallback(() => {
    setHoverVisible(false);
  }, []);

  /* ── ヒーロー画像読み込み ── */
  useEffect(() => {
    if (!defaultSrc) return;
    const img = new Image();
    img.src = defaultSrc;
    img.onload = () => setLoaded(true);
    img.onerror = () => setIndex((i) => i + 1);
  }, [defaultSrc]);

  return (
    <main className="top-hero" style={{ overflow: "hidden" }}>
      {/* デフォルト背景画像 */}
      {defaultSrc ? (
        <div
          className="top-hero-bg"
          style={{
            backgroundImage: `url(${defaultSrc})`,
            opacity: loaded ? 1 : 0,
          }}
        />
      ) : (
        <div className="top-hero-placeholder">
          /public/images/top-hero.(jpg|jpeg|png|webp) を配置してください
        </div>
      )}

      {/* ホバー時の背景画像 */}
      {hoverSrc ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${hoverSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: hoverVisible ? 1 : 0,
            zIndex: 1,
            transition: "opacity 500ms ease",
          }}
        />
      ) : null}

      {/* オーバーレイグラデーション */}
      <div className="top-hero-overlay" />

      {/* 左上: ブランド名 + モバイルメニューボタン */}
      <div className="top-hero-brand-top">
        <div className="top-hero-brand-name">HAYATO KANO</div>
        <button
          type="button"
          className="mobile-menu-button top-hero-mobile-menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((o) => !o)}
          style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
        >
          <span className="mobile-menu-label" style={{ color: "#fff" }}>
            {mobileMenuOpen ? "Close" : "Menu"}
          </span>
        </button>
      </div>

      {/* モバイルフルスクリーンメニュー（ヘッダーと同じ） */}
      {mobileMenuOpen ? (
        <div className="mobile-overlay">
          <nav className="mobile-overlay-nav">
            {NAV_ITEMS.map(({ num, label, href }) => (
              <Link
                key={href}
                href={href}
                className="mobile-nav-item"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mobile-nav-num">{num}</span>
                <span className="mobile-nav-label">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      {/* 左下: 最新 Works リスト */}
      <div className="top-hero-brand">
        <div className="top-hero-works" onMouseLeave={handleWorkLeave}>
          {latestWorks.map((work) => (
            <Link
              key={work.href}
              href={work.href}
              className="top-hero-works-item"
              onMouseEnter={() => handleWorkHover(work.image)}
            >
              {work.title}（{work.year}）
            </Link>
          ))}
          <Link href="/works" className="top-hero-works-more">
            More
          </Link>
        </div>
      </div>

      {/* 右下: ナビゲーション（縦並び） */}
      <nav className="top-hero-nav">
        {NAV_ITEMS.map(({ num, label, href }) => (
          <Link key={href} href={href} className="top-hero-nav-item">
            <span className="top-hero-nav-num">{num}</span>
            <span className="top-hero-nav-label">{label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}

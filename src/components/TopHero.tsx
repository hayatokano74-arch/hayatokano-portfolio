"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/* ナビ項目（ヘッダーと統一） */
const NAV_ITEMS = [
  { num: "01", label: "Works", href: "/works" },
  { num: "02", label: "Text", href: "/text" },
  { num: "03", label: "目の星", href: "/me-no-hoshi" },
  { num: "04", label: "Time Line", href: "/timeline" },
  { num: "05", label: "News", href: "/news" },
  { num: "06", label: "About", href: "/about" },
  { num: "07", label: "Contact", href: "/contact" },
];

export function TopHero({ candidates }: { candidates: string[] }) {
  const [index, setIndex] = useState(0);
  const src = useMemo(() => candidates[index] ?? null, [candidates, index]);
  const [loaded, setLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  /* 画像読み込み完了でフェードイン */
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setIndex((i) => i + 1);
  }, [src]);

  /* スクロールダウンインジケーターのアニメーション */
  const [scrollHidden, setScrollHidden] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrollHidden(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ── ヒーローセクション: フルスクリーン ── */}
      <section ref={heroRef} className="top-hero">
        {/* 背景画像 */}
        {src ? (
          <div
            className="top-hero-bg"
            style={{
              backgroundImage: `url(${src})`,
              opacity: loaded ? 1 : 0,
            }}
          />
        ) : (
          <div className="top-hero-placeholder">
            /public/images/top-hero.(jpg|jpeg|png|webp) を配置してください
          </div>
        )}

        {/* オーバーレイグラデーション（下部を暗く） */}
        <div className="top-hero-overlay" />

        {/* 左下: ブランド + 年号 */}
        <div className="top-hero-brand">
          <div className="top-hero-brand-name">HAYATO KANO</div>
          <div className="top-hero-brand-year">2025 —</div>
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

        {/* スクロールダウンインジケーター */}
        <div
          className="top-hero-scroll"
          style={{ opacity: scrollHidden ? 0 : 1 }}
        >
          <div className="top-hero-scroll-line" />
        </div>
      </section>
    </>
  );
}

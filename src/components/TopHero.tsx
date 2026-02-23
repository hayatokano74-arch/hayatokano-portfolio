"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import { ThemeDot } from "@/components/ThemeToggle";

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

/* ── ローディング画面 ── */
function TopLoader({ progress, visible }: { progress: number; visible: boolean }) {
  return (
    <div
      className={`top-loader ${visible ? "" : "top-loader--hidden"}`}
      aria-hidden={!visible}
    >
      <div className="top-loader-brand">HAYATO KANO</div>
      <div className="top-loader-bar">
        <div
          className="top-loader-bar-fill"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
    </div>
  );
}

export function TopHero({ candidates, latestWorks }: Props) {
  const [index, setIndex] = useState(0);
  const defaultSrc = useMemo(() => candidates[index] ?? null, [candidates, index]);
  const [loaded, setLoaded] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const progressTimer = useRef<ReturnType<typeof setInterval>>(null);

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

  /* ── ヒーロー画像読み込み + プログレスバー ── */
  useEffect(() => {
    if (!defaultSrc) {
      setLoaderDone(true);
      return;
    }

    // プログレスバーのアニメーション（疑似的に進む、90%で止まる）
    let current = 0;
    progressTimer.current = setInterval(() => {
      current += Math.random() * 12 + 3;
      if (current > 90) current = 90;
      setProgress(current);
    }, 150);

    const img = new Image();
    img.src = defaultSrc;
    img.onload = () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setProgress(100);
      setLoaded(true);
      // プログレスバーが100%になった後にローダーをフェードアウト
      setTimeout(() => setLoaderDone(true), 400);
    };
    img.onerror = () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setIndex((i) => i + 1);
    };

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [defaultSrc]);

  /* ── preload link を動的に挿入 ── */
  useEffect(() => {
    if (!defaultSrc) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = defaultSrc;
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [defaultSrc]);

  return (
    <main id="main-content" className="top-hero" style={{ overflow: "hidden" }}>
      {/* ── ローディング画面 ── */}
      <TopLoader progress={progress} visible={!loaderDone} />

      {/* デフォルト背景画像 */}
      {defaultSrc ? (
        <div
          className="top-hero-bg"
          style={{
            backgroundImage: `url(${defaultSrc})`,
            opacity: loaderDone && loaded ? 1 : 0,
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

      {/* 上部: ヘッダーバー — ローダー終了後にフェードイン */}
      <div
        className={`top-hero-header ${mobileMenuOpen ? "menu-open" : ""}`}
        style={{
          opacity: loaderDone ? 1 : 0,
          transition: "opacity 0.8s ease 0.1s",
        }}
      >
        <div className="top-hero-brand-name">HAYATO KANO</div>

        {/* モバイルメニューボタン */}
        <button
          type="button"
          className={`mobile-menu-button top-hero-mobile-menu ${mobileMenuOpen ? "is-open" : ""}`}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          onClick={() => setMobileMenuOpen((o) => !o)}
        >
          <span className="mobile-menu-icon" style={{ "--icon-color": "#fff" } as React.CSSProperties} />
        </button>

        {/* テーマ切替ドット */}
        <ThemeDot className="top-hero-theme-dot" />

        {/* デスクトップナビ（ヘッダーと同位置） */}
        <nav className="top-hero-nav">
          {NAV_ITEMS.map(({ num, label, href }) => (
            <Link key={href} href={href} className="top-hero-nav-item">
              <span className="top-hero-nav-num">{num}</span>
              <span className="top-hero-nav-label">{label}</span>
            </Link>
          ))}
        </nav>
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
            <div style={{ marginTop: "var(--space-7)" }}>
              <ThemeDot />
            </div>
          </nav>
        </div>
      ) : null}

      {/* 下部: 最新 Works リスト — ローダー終了後にフェードイン */}
      <div
        className="top-hero-bottom"
        style={{
          opacity: loaderDone ? 1 : 0,
          transition: "opacity 0.8s ease 0.3s",
        }}
      >
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
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

/* 現在時刻をJST表示 */
function useCurrentTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-GB", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function TopHero({ candidates }: { candidates: string[] }) {
  const [index, setIndex] = useState(0);
  const src = useMemo(() => candidates[index] ?? null, [candidates, index]);
  const [loaded, setLoaded] = useState(false);
  const time = useCurrentTime();

  /* 画像読み込み完了でフェードイン */
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setIndex((i) => i + 1);
  }, [src]);

  return (
    <main className="top-hero" style={{ overflow: "hidden" }}>
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

      {/* オーバーレイグラデーション */}
      <div className="top-hero-overlay" />

      {/* 左下: ブランド名 + 時刻・場所 */}
      <div className="top-hero-brand">
        <div className="top-hero-brand-name">HAYATO KANO</div>
        {time ? (
          <div className="top-hero-brand-meta">
            Ishinomaki, JP — {time} JST
          </div>
        ) : null}
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

"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import { ThemeDot } from "@/components/ThemeToggle";

type Props = {
  navImages: Record<string, string | null>;
};

export function TopHero({ navImages }: Props) {
  const [hoverImage, setHoverImage] = useState<string | null>(null);
  const [hoverVisible, setHoverVisible] = useState(false);

  const handleHover = useCallback(
    (href: string) => {
      const img = navImages[href];
      if (img) {
        setHoverImage(img);
        setHoverVisible(true);
      } else {
        setHoverVisible(false);
      }
    },
    [navImages],
  );

  const handleLeave = useCallback(() => {
    setHoverVisible(false);
  }, []);

  const hasHover = hoverVisible && hoverImage;

  return (
    <main
      id="main-content"
      className={`top-page ${hasHover ? "has-hover" : ""}`}
    >
      {/* ホバー時の背景画像 */}
      {hoverImage && (
        <div
          className="top-page-hover-bg"
          style={{
            backgroundImage: `url(${hoverImage})`,
            opacity: hoverVisible ? 1 : 0,
          }}
        />
      )}

      {/* ヘッダー行: 名前 + テーマドット */}
      <div className="top-page-header">
        <span className="top-page-name">HAYATO KANO</span>
        <ThemeDot />
      </div>

      {/* ナビリスト */}
      <nav className="top-page-nav" onMouseLeave={handleLeave}>
        {NAV_ITEMS.map(({ num, label, href }, i) => (
          <div key={href} className="top-page-nav-row">
            {i > 0 && <div className="top-page-line" />}
            <Link
              href={href}
              className="top-page-nav-item"
              onMouseEnter={() => handleHover(href)}
            >
              <span className="top-page-nav-num">{num}</span>
              <span className="top-page-nav-label">{label}</span>
            </Link>
          </div>
        ))}
      </nav>
    </main>
  );
}

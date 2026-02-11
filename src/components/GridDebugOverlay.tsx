"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * グリッドデバッグオーバーレイ
 * - Ctrl+G で表示/非表示を切替
 * - 12カラムグリッドの半透明オーバーレイ
 * - 現在のブレークポイント名を右下に表示
 * - 開発環境でのみ使用
 */
export function GridDebugOverlay() {
  const [visible, setVisible] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "g") {
      e.preventDefault();
      setVisible((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!visible) return null;

  return (
    <>
      {/* 12カラムグリッドオーバーレイ */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 99999,
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "var(--grid-gutter, 1.5rem)",
          paddingInline: "var(--pad-x, 52px)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255, 0, 0, 0.06)",
              borderInline: "1px solid rgba(255, 0, 0, 0.12)",
              height: "100vh",
            }}
          />
        ))}
      </div>

      {/* ブレークポイントインジケーター */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 12,
          left: 12,
          zIndex: 99999,
          pointerEvents: "none",
          fontFamily: "var(--font-inter, monospace)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "rgba(255, 0, 0, 0.7)",
          background: "rgba(255, 255, 255, 0.85)",
          padding: "3px 8px",
          borderRadius: 4,
          lineHeight: 1,
          backdropFilter: "blur(4px)",
        }}
      >
        <BreakpointLabel />
      </div>

      {/* 操作ヒント */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 99999,
          pointerEvents: "none",
          fontFamily: "var(--font-inter, monospace)",
          fontSize: 10,
          color: "rgba(255, 0, 0, 0.5)",
          background: "rgba(255, 255, 255, 0.85)",
          padding: "3px 8px",
          borderRadius: 4,
          lineHeight: 1,
          backdropFilter: "blur(4px)",
        }}
      >
        Ctrl+G to hide
      </div>
    </>
  );
}

/** 現在のブレークポイント名を返すコンポーネント */
function BreakpointLabel() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setLabel(`MOBILE — ${w}px`);
      else if (w < 1024) setLabel(`TABLET — ${w}px`);
      else if (w < 1280) setLabel(`DESKTOP — ${w}px`);
      else if (w < 1536) setLabel(`WIDE — ${w}px`);
      else setLabel(`ULTRA-WIDE — ${w}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return <>{label}</>;
}

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * グリッドデバッグオーバーレイ
 * - Ctrl+G: 12カラムグリッド（列）の表示/非表示
 * - Ctrl+H: 8px ベースライングリッド（行）の表示/非表示
 * - 現在のブレークポイント名を左下に表示
 */
export function GridDebugOverlay() {
  const [showColumns, setShowColumns] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "g") {
      e.preventDefault();
      setShowColumns((v) => !v);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "h") {
      e.preventDefault();
      setShowBaseline((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const visible = showColumns || showBaseline;
  if (!visible) return null;

  return (
    <>
      {/* 12カラムグリッドオーバーレイ（列） */}
      {showColumns ? (
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
      ) : null}

      {/* 8px ベースライングリッドオーバーレイ（行） */}
      {showBaseline ? (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 99998,
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 7px, rgba(0, 120, 255, 0.12) 7px, rgba(0, 120, 255, 0.12) 8px)",
            backgroundSize: "100% 8px",
          }}
        />
      ) : null}

      {/* ブレークポイント + グリッド状態インジケーター */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 12,
          left: 12,
          zIndex: 99999,
          pointerEvents: "none",
          fontFamily: "monospace",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "rgba(255, 0, 0, 0.7)",
          background: "rgba(255, 255, 255, 0.85)",
          padding: "3px 8px",
          borderRadius: 4,
          lineHeight: 1,
          backdropFilter: "blur(4px)",
          display: "flex",
          gap: 8,
        }}
      >
        <BreakpointLabel />
        <span style={{ opacity: 0.5 }}>
          {showColumns ? "COL" : ""}
          {showColumns && showBaseline ? " + " : ""}
          {showBaseline ? "BASE" : ""}
        </span>
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
          fontFamily: "monospace",
          fontSize: 10,
          color: "rgba(255, 0, 0, 0.5)",
          background: "rgba(255, 255, 255, 0.85)",
          padding: "3px 8px",
          borderRadius: 4,
          lineHeight: 1.6,
          backdropFilter: "blur(4px)",
        }}
      >
        ⌘G 列グリッド &nbsp;|&nbsp; ⌘H ベースライン
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

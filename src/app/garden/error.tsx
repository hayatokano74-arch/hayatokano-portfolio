"use client";

import { useEffect } from "react";

/**
 * Garden ページのエラーバウンダリ。
 * ISR キャッシュが存在しない場合（初回ビルド失敗等）のみ表示される。
 * 通常は ISR が前回成功ページを配信するため、この画面は見えない。
 */
export default function GardenError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Garden] ページエラー:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "var(--space-5)",
        color: "var(--fg)",
      }}
    >
      <p style={{ fontSize: "var(--font-body)", color: "var(--muted)" }}>
        データの読み込みに失敗しました
      </p>
      <button
        type="button"
        onClick={reset}
        className="action-link"
        style={{
          fontSize: "var(--font-body)",
          fontWeight: 700,
          padding: "var(--space-3) var(--space-6)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-s)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        再読み込み
      </button>
    </div>
  );
}

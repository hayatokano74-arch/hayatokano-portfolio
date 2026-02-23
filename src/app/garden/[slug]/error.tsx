"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Garden 個別ページのエラーバウンダリ。
 * ISR キャッシュが存在しない場合のみ表示される。
 */
export default function GardenSlugError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Garden/slug] ページエラー:", error);
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
      <div style={{ display: "flex", gap: "var(--space-5)" }}>
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
        <Link
          href="/garden"
          className="action-link"
          style={{
            fontSize: "var(--font-body)",
            fontWeight: 700,
            padding: "var(--space-3) var(--space-6)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-s)",
          }}
        >
          Garden に戻る
        </Link>
      </div>
    </div>
  );
}

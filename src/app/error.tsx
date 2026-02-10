"use client";

import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <CanvasShell>
      <Header active="Works" title="Works" showCategoryRow={false} showTitleRow={false} />
      <div style={{ marginTop: "var(--space-14)", textAlign: "center" }}>
        <div style={{ fontSize: "var(--font-heading)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
          Error
        </div>
        <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", color: "var(--muted)", fontWeight: 500, marginBottom: "var(--space-8)" }}>
          予期しないエラーが発生しました
        </div>
        <button
          type="button"
          onClick={reset}
          className="action-link"
          style={{ fontSize: "var(--font-body)", fontWeight: 700, border: 0, background: "transparent", padding: 0 }}
        >
          再試行
        </button>
      </div>
    </CanvasShell>
  );
}

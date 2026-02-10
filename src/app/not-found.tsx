import Link from "next/link";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <CanvasShell>
      <Header active="Works" title="Works" showCategoryRow={false} showTitleRow={false} />
      <div style={{ marginTop: "var(--space-14)", textAlign: "center" }}>
        <div style={{ fontSize: "var(--font-heading)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
          404
        </div>
        <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", color: "var(--muted)", fontWeight: 500, marginBottom: "var(--space-8)" }}>
          ページが見つかりませんでした
        </div>
        <Link
          href="/"
          className="action-link"
          style={{ fontSize: "var(--font-body)", fontWeight: 700 }}
        >
          トップに戻る
        </Link>
      </div>
    </CanvasShell>
  );
}

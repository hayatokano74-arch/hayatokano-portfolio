import Link from "next/link";
import type { ArchiveYear } from "@/lib/timeline-utils";
import { buildMonthHref, buildDateHref } from "@/lib/timeline-utils";
import { ToggleArrow } from "./ToggleArrow";

/** ボタン共通スタイル */
export const btnStyle = {
  border: 0,
  background: "transparent",
  padding: 0,
  cursor: "pointer",
} as const;

/**
 * アーカイブツリーの年→月→日ノードを描画する共通コンポーネント
 * ArchiveSidebar と MobileArchiveDrawer で共有
 */
export function ArchiveTreeNodes({
  tree,
  openKeys,
  toggle,
  activeMonth,
  activeDate,
  onNavigate,
}: {
  tree: ArchiveYear[];
  openKeys: Set<string>;
  toggle: (key: string) => void;
  activeMonth?: string;
  activeDate?: string;
  /** リンククリック時のコールバック（モバイルドロワーの閉じる等） */
  onNavigate?: () => void;
}) {
  return (
    <>
      {tree.map((yearNode) => {
        const yearOpen = openKeys.has(yearNode.year);
        return (
          <div key={yearNode.year} style={{ marginBottom: "var(--space-3)" }}>
            {/* 年ラベル */}
            <button
              type="button"
              onClick={() => toggle(yearNode.year)}
              aria-expanded={yearOpen}
              aria-label={`${yearNode.year}年のアーカイブ`}
              style={{
                ...btnStyle,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--font-body)",
                lineHeight: "var(--lh-normal)",
                fontWeight: 700,
                color: "var(--fg)",
              }}
            >
              <ToggleArrow open={yearOpen} />
              <span>{yearNode.year}</span>
              <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                ({yearNode.count})
              </span>
            </button>

            {/* 月一覧 */}
            {yearOpen ? (
              <div style={{ paddingLeft: "var(--space-3)", marginTop: "var(--space-1)" }}>
                {yearNode.months.map((monthNode) => {
                  const monthOpen = openKeys.has(monthNode.key);
                  const isMonthActive = activeMonth === monthNode.key;
                  return (
                    <div key={monthNode.key} style={{ marginBottom: "var(--space-1)" }}>
                      {/* 月ラベル */}
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>
                        <button
                          type="button"
                          onClick={() => toggle(monthNode.key)}
                          aria-expanded={monthOpen}
                          aria-label={`${Number(monthNode.month)}月のアーカイブ`}
                          style={{ ...btnStyle, display: "inline-flex", alignItems: "center" }}
                        >
                          <ToggleArrow open={monthOpen} />
                        </button>
                        <Link
                          href={buildMonthHref(monthNode.key, activeMonth)}
                          className={`${isMonthActive ? "underline-active" : ""} action-link`.trim()}
                          onClick={onNavigate}
                          style={{
                            fontWeight: isMonthActive ? 700 : 500,
                            color: isMonthActive ? "var(--fg)" : "var(--muted)",
                          }}
                        >
                          {Number(monthNode.month)}月
                        </Link>
                        <span style={{ fontSize: "var(--font-meta)", fontWeight: 400, color: "var(--muted)" }}>
                          ({monthNode.count})
                        </span>
                      </div>

                      {/* 日付一覧 */}
                      {monthOpen ? (
                        <div style={{ paddingLeft: "var(--space-3)", marginTop: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          {monthNode.dates.map((d) => {
                            const isDateActive = activeDate === d;
                            return (
                              <Link
                                key={d}
                                href={buildDateHref(d, activeDate)}
                                className={`${isDateActive ? "underline-active" : ""} action-link`.trim()}
                                onClick={onNavigate}
                                style={{
                                  display: "inline-block",
                                  fontSize: "var(--font-meta)",
                                  lineHeight: "var(--lh-normal)",
                                  fontWeight: isDateActive ? 700 : 400,
                                  color: isDateActive ? "var(--fg)" : "var(--muted)",
                                }}
                              >
                                {d}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

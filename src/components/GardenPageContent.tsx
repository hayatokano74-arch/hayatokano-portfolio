"use client";

/**
 * Garden一覧ページのClient Component
 * 検索状態を管理し、GardenSearch と GardenGrid を統合する。
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { GardenNode } from "@/lib/garden/types";
import { useGardenSearch } from "@/lib/garden/use-garden-search";
import { GardenSearch } from "./GardenSearch";
import { GardenGrid } from "./GardenGrid";

export function GardenPageContent({ nodes }: { nodes: GardenNode[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState<string | null>(initialQuery || null);
  const search = useGardenSearch();

  // URL の ?q= パラメータで初期検索を実行
  useEffect(() => {
    if (initialQuery && search.ready) {
      search.fullSearch(initialQuery);
    }
  }, [search.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFullSearch = useCallback(
    (query: string | null) => {
      setSearchQuery(query);
      if (query) {
        const url = new URL(window.location.href);
        url.searchParams.set("q", query);
        window.history.replaceState({}, "", url.toString());
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete("q");
        window.history.replaceState({}, "", url.toString());
      }
    },
    [],
  );

  // 全文検索結果のIDセット
  const fullSearchIds = useMemo(() => {
    if (!searchQuery || !search.fullResults) return null;
    return search.fullResults.map((r) => r.id);
  }, [searchQuery, search.fullResults]);

  // フィルタされたノード
  const filteredNodes = useMemo(() => {
    if (!fullSearchIds) return nodes;
    const idSet = new Set(fullSearchIds);
    return nodes.filter((n) => idSet.has(n.title));
  }, [nodes, fullSearchIds]);

  return (
    <>
      <GardenSearch
        search={search}
        onFullSearch={handleFullSearch}
        fullSearchIds={fullSearchIds}
      />
      <div style={{ marginTop: "var(--space-6)" }}>
        <GardenGrid nodes={filteredNodes} />
      </div>
    </>
  );
}

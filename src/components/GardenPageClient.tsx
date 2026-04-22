"use client";

/**
 * Garden 一覧ページ（クライアントサイドデータ取得版）
 * CMS API から全ノードを取得し、GardenPageContent に渡す。
 */

import type { GardenNode } from "@/lib/garden/types";
import { fetchGardenFromCms } from "@/lib/cms/garden-client";
import { useCmsData } from "@/hooks/useCmsData";
import { GardenPageContent } from "./GardenPageContent";
import { Header } from "./Header";

/** 空ノードリスト（初期値・フォールバック用） */
const EMPTY_NODES: GardenNode[] = [];

export function GardenPageClient() {
  const { data: nodes, loading } = useCmsData(fetchGardenFromCms, EMPTY_NODES);

  if (loading) {
    return (
      <>
        <Header
          active="Garden"
          title="Garden"
          showTitleRow={false}
          showCategoryRow={false}
          showSearch={false}
        />
        <div style={{ minHeight: "50vh" }} />
      </>
    );
  }

  return <GardenPageContent nodes={nodes} />;
}

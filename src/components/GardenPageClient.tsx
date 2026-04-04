"use client";

/**
 * Garden 一覧ページ（クライアントサイドデータ取得版）
 * CMS API から全ノードを取得し、GardenPageContent に渡す。
 */

import { useEffect, useState } from "react";
import type { GardenNode } from "@/lib/garden/types";
import { fetchGardenFromCms } from "@/lib/cms/garden-client";
import { GardenPageContent } from "./GardenPageContent";
import { Header } from "./Header";

export function GardenPageClient() {
  const [nodes, setNodes] = useState<GardenNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGardenFromCms()
      .then(setNodes)
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, []);

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

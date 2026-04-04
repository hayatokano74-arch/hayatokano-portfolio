"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { GardenNode } from "@/lib/garden/types";
import { fetchGardenFromCms } from "@/lib/cms/garden-client";
import { Header } from "./Header";
import { GardenBody } from "./GardenBody";
import { GardenNavigation } from "./GardenNavigation";

export function GardenDetailPageClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ? decodeURIComponent(params.slug) : "";

  const [allNodes, setAllNodes] = useState<GardenNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGardenFromCms()
      .then(setAllNodes)
      .catch(() => setAllNodes([]))
      .finally(() => setLoading(false));
  }, []);

  const node = allNodes.find((n) => n.slug === slug);

  /* 前後ノード（時系列順: allNodesは日付降順） */
  const idx = node ? allNodes.indexOf(node) : -1;
  const newer = idx > 0 ? allNodes[idx - 1] : null;
  const older = idx >= 0 && idx < allNodes.length - 1 ? allNodes[idx + 1] : null;
  const prev = older ? { slug: older.slug, title: older.title, date: older.date } : null;
  const next = newer ? { slug: newer.slug, title: newer.title, date: newer.date } : null;

  if (loading) {
    return (
      <Header
        active="Garden"
        title="Garden"
        showTitleRow={false}
        showCategoryRow={false}
        showSearch={false}
      />
    );
  }

  if (!node) {
    return (
      <>
        <Header active="Garden" title="Garden" showTitleRow={false} showCategoryRow={false} showSearch={false} />
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--muted)" }}>
          ページが見つかりませんでした
        </div>
      </>
    );
  }

  return (
    <>
      <Header active="Garden" title="Garden" showTitleRow={false} showCategoryRow={false} showSearch={false} />
      <article className="garden-detail">
        <h1 className="garden-detail-title">{node.title}</h1>
        <div className="garden-detail-meta">
          <time className="garden-detail-date">{node.date}</time>
        </div>
        <GardenBody html={node.contentHtml} className="garden-detail-body" />
        <GardenNavigation prev={prev} next={next} />
      </article>
    </>
  );
}

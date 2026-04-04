"use client";

/**
 * 目の星 詳細ページ（クライアントサイドデータ取得版）
 * URL の slug に基づいて CMS API から目の星データを取得する。
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { MeNoHoshiPost } from "@/lib/me-no-hoshi/types";
import { fetchMeNoHoshiFromCms } from "@/lib/cms/me-no-hoshi-client";
import { Header } from "./Header";
import { MeNoHoshiDetail } from "./MeNoHoshiDetail";

export function MeNoHoshiDetailPageClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ? decodeURIComponent(params.slug) : "";

  const [posts, setPosts] = useState<MeNoHoshiPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeNoHoshiFromCms()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const post = posts.find((p) => p.slug === slug);

  if (loading) {
    return (
      <>
        <Header
          active="目の星"
          title="目の星"
          brandLabel="目の星"
          brandHref="/me-no-hoshi"
          showTitleRow={false}
          showCategoryRow={false}
        />
        <div style={{ minHeight: "50vh" }} />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header
          active="目の星"
          title="目の星"
          brandLabel="目の星"
          brandHref="/me-no-hoshi"
          showTitleRow={false}
          showCategoryRow={false}
        />
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--muted)" }}>
          展示が見つかりませんでした
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        active="目の星"
        title={post.title}
        brandLabel="目の星"
        brandHref="/me-no-hoshi"
        showTitleRow={false}
        showCategoryRow={false}
      />
      <MeNoHoshiDetail post={post} />
    </>
  );
}

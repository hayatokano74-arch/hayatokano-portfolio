"use client";

import type { MeNoHoshiPost } from "@/lib/me-no-hoshi/types";
import { Header } from "./Header";
import { MeNoHoshiDetail } from "./MeNoHoshiDetail";

export function MeNoHoshiDetailPageClient({ post }: { post: MeNoHoshiPost | null }) {
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

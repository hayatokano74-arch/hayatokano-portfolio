import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { SelectWorksPageClient } from "@/components/SelectWorksPageClient";
import { getSelectWorks } from "@/lib/works";

// CMS更新時に /api/revalidate を叩くことで即時反映（メイン経路）
export const revalidate = 3600;

// 非公開ページ: リンクを知る人だけがアクセスする想定のため検索エンジンには出さない
export const metadata: Metadata = {
  title: "Select Works",
  robots: { index: false, follow: false },
};

export default async function SelectWorksPage() {
  const works = await getSelectWorks();
  return (
    <CanvasShell>
      <SelectWorksPageClient works={works} />
    </CanvasShell>
  );
}

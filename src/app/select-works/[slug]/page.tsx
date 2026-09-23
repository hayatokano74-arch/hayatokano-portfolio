import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { SelectWorksDetailPageClient } from "@/components/SelectWorksDetailPageClient";

// 非公開ページ: ビルド時に静的生成せず、リンクを知る人がアクセスした時だけ描画する
export const dynamicParams = true;

// 検索エンジンには出さない
export const metadata: Metadata = {
  title: "Select Works",
  robots: { index: false, follow: false },
};

export default function SelectWorksDetailPage() {
  return (
    <CanvasShell>
      <SelectWorksDetailPageClient />
    </CanvasShell>
  );
}

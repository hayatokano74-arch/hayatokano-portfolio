import { works } from "@/lib/mock";
import { CanvasShell } from "@/components/CanvasShell";
import { TestGalleryClient } from "@/components/TestGalleryClient";

export const metadata = { title: "Gallery Test" };

export default function TestGalleryPage() {
  /* テスト用: 最初のワークのメディアを使用 */
  const work = works[0];
  return (
    <CanvasShell>
      <TestGalleryClient
        title={work.title}
        category={work.tags[0] ?? ""}
        media={work.media}
      />
    </CanvasShell>
  );
}

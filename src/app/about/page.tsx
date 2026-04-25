import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { AboutPageClient } from "@/components/AboutPageClient";
import { getAbout } from "@/lib/about";

// 更新頻度が低いため24時間キャッシュ（手動revalidateで即時反映可能）
export const revalidate = 86400;
export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const about = await getAbout().catch(() => null);
  return (
    <CanvasShell>
      <AboutPageClient about={about} />
    </CanvasShell>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { GardenShell } from "@/components/GardenShell";
import { GardenPageContent } from "@/components/GardenPageContent";
import { getAllNodes } from "@/lib/garden/reader";

export const metadata: Metadata = {
  title: "Garden",
  description: "Hayato Kano のデジタルガーデン。写真・映像・日々の記録。",
  openGraph: {
    title: "Garden",
    description: "Hayato Kano のデジタルガーデン。写真・映像・日々の記録。",
    type: "website",
  },
};

/* ISR: CDNキャッシュを1時間保持（ノードキャッシュ使用時は処理が瞬時） */
export const revalidate = 3600;

export default async function GardenPage() {
  const nodes = await getAllNodes();

  return (
    <GardenShell>
      <Suspense>
        <GardenPageContent nodes={nodes} />
      </Suspense>
    </GardenShell>
  );
}

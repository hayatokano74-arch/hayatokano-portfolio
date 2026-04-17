import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { PhotoRollPageClient } from "@/components/PhotoRollPageClient";
import { getPhotoRoll } from "@/lib/photo-roll";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Photo Roll",
  description: "日々のスナップ。",
};

export default async function PhotoRollPage() {
  const photos = await getPhotoRoll();
  return (
    <CanvasShell>
      <PhotoRollPageClient photos={photos} />
    </CanvasShell>
  );
}

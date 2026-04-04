import type { Metadata } from "next";
import { GardenShell } from "@/components/GardenShell";
import { GardenPageClient } from "@/components/GardenPageClient";

export const metadata: Metadata = {
  title: "Garden",
  description: "Hayato Kano のデジタルガーデン。写真・映像・日々の記録。",
};

export default function GardenPage() {
  return (
    <GardenShell>
      <GardenPageClient />
    </GardenShell>
  );
}

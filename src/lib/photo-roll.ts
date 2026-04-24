import { cache } from "react";
import { fetchCms } from "@/lib/cms/client";
import { absoluteMediaSrc } from "@/lib/url-utils";

export type { PhotoRollItem } from "@/lib/cms/photo-roll-client";

import type { PhotoRollItem } from "@/lib/cms/photo-roll-client";

interface CmsPhotoRollItem {
  id: number;
  slug: string;
  title: string;
  date: string;
  time: string;
  src: string;
  width: number;
  height: number;
  published: number;
}

export const getPhotoRoll = cache(async (): Promise<PhotoRollItem[]> => {
  try {
    const items = await fetchCms<CmsPhotoRollItem[]>("photo-roll.php");
    return items.map((item) => ({
      slug: item.slug,
      title: item.title,
      date: item.date,
      time: item.time || "",
      src: absoluteMediaSrc(item.src),
      width: item.width || 0,
      height: item.height || 0,
    }));
  } catch {
    return [];
  }
});

"use client";

import { fetchCmsClient } from "./use-cms";

export interface PhotoRollItem {
  slug: string;
  title: string;
  date: string;
  time: string;
  src: string;
  width: number;
  height: number;
}

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

export async function fetchPhotoRoll(): Promise<PhotoRollItem[]> {
  const items = await fetchCmsClient<CmsPhotoRollItem[]>("photo-roll.php");
  return items.map((item) => ({
    slug: item.slug,
    title: item.title,
    date: item.date,
    time: item.time || "",
    src: item.src,
    width: item.width || 0,
    height: item.height || 0,
  }));
}

"use client";

/**
 * About クライアントサイドデータ取得
 * CMS API から直接取得し、About 型に正規化する。
 */

import type { About } from "@/lib/about";
import type { CmsAbout } from "./client";
import { fetchCmsClient } from "./use-cms";
import { absoluteMediaSrc } from "@/lib/url-utils";

/** CMS API から About データを取得 */
export async function fetchAboutFromCms(): Promise<About> {
  const item = await fetchCmsClient<CmsAbout>("about.php");

  const statement =
    item.body?.trim() ||
    (item.data.statement as string | undefined)?.trim() ||
    "";

  const photos = (
    (item.data.photos ?? []) as {
      src: string;
      width?: number;
      height?: number;
    }[]
  )
    .filter((p) => p.src)
    .map((p) => ({
      src: absoluteMediaSrc(p.src),
      width: p.width ?? 640,
      height: p.height ?? 420,
    }));

  const cv = ((item.data.cv ?? []) as { year: string; content: string }[])
    .filter((c) => c.content)
    .map((c) => ({ year: String(c.year ?? ""), content: c.content }));

  return { statement, photos, cv };
}

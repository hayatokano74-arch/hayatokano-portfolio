"use client";

/**
 * 目の星 クライアントサイドデータ取得
 * CMS API から直接取得し、MeNoHoshiPost 型に正規化する。
 */

import type { MeNoHoshiPost, WpMeNoHoshiResponse } from "@/lib/me-no-hoshi/types";
import { normalizePost } from "@/lib/me-no-hoshi/normalize";
import type { CmsMeNoHoshi } from "./client";
import { fetchCmsClient } from "./use-cms";

/** CMS レスポンスを WpMeNoHoshiResponse 形式に変換して normalizePost に渡す */
function cmsItemToPost(item: CmsMeNoHoshi): MeNoHoshiPost | null {
  const d = item.data as Record<string, unknown>;
  const wpLike: WpMeNoHoshiResponse = {
    slug: item.slug,
    title: item.title,
    date: item.date,
    year: item.year,
    tags: item.tags,
    excerpt: item.excerpt,
    media: d.media as WpMeNoHoshiResponse["media"],
    details: d.details as WpMeNoHoshiResponse["details"],
    bio: typeof d.bio === "string" ? d.bio : undefined,
    statement: item.body || (typeof d.statement === "string" ? d.statement : undefined),
    notice: typeof d.notice === "string" ? d.notice : undefined,
    subtitle: typeof d.subtitle === "string" ? d.subtitle : undefined,
    keyVisuals: d.keyVisuals as WpMeNoHoshiResponse["keyVisuals"],
    heroCaption: typeof d.heroCaption === "string" ? d.heroCaption : undefined,
    pastWorks: d.pastWorks as WpMeNoHoshiResponse["pastWorks"],
    archiveNote: typeof d.archiveNote === "string" ? d.archiveNote : undefined,
    archiveWorks: d.archiveWorks as WpMeNoHoshiResponse["archiveWorks"],
    showKeyVisuals: typeof d.showKeyVisuals === "boolean" ? d.showKeyVisuals : undefined,
    showPastWorks: typeof d.showPastWorks === "boolean" ? d.showPastWorks : undefined,
    showArchiveWorks: typeof d.showArchiveWorks === "boolean" ? d.showArchiveWorks : undefined,
    pastExhibitions: d.pastExhibitions as WpMeNoHoshiResponse["pastExhibitions"],
    snsLinks: d.snsLinks as WpMeNoHoshiResponse["snsLinks"],
  };
  return normalizePost(wpLike);
}

/** CMS API から全 目の星 を取得 */
export async function fetchMeNoHoshiFromCms(): Promise<MeNoHoshiPost[]> {
  const items = await fetchCmsClient<CmsMeNoHoshi[]>("me-no-hoshi.php");
  const posts: MeNoHoshiPost[] = [];
  for (const item of items) {
    const p = cmsItemToPost(item);
    if (p) posts.push(p);
  }
  posts.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  return posts;
}

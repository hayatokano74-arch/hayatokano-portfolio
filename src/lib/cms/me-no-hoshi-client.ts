"use client";

/**
 * 目の星 クライアントサイドデータ取得
 * CMS API から直接取得し、MeNoHoshiPost 型に正規化する。
 */

import type { MeNoHoshiPost, WpMeNoHoshiResponse } from "@/lib/me-no-hoshi/types";
import { normalizePost } from "@/lib/me-no-hoshi/normalize";
import { fetchCmsClient } from "./use-cms";

export async function fetchMeNoHoshiFromCms(): Promise<MeNoHoshiPost[]> {
  const raw = await fetchCmsClient<WpMeNoHoshiResponse[]>("me-no-hoshi.php");
  return raw
    .map((item) => normalizePost(item))
    .filter((p): p is MeNoHoshiPost => p !== null)
    .sort((a, b) => (b.date > a.date ? 1 : -1));
}

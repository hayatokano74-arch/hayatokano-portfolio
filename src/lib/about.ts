/**
 * About データ取得
 *
 * 優先順位:
 *  1. PHP CMS API（https://hayatokano.com/_cms/api/about.php）
 *  2. content/about/index.md のローカルファイル（CMS が空 / 未到達時のフォールバック）
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { about as fallbackAbout } from "@/lib/mock";
import { fetchCms, type CmsAbout } from "@/lib/cms/client";
import { absoluteMediaSrc } from "@/lib/url-utils";

/** About の型 */
export type About = {
  statement: string;
  photos: { src: string; width: number; height: number }[];
  cv: { year: string; content: string }[];
};

const ABOUT_FILE = path.join(process.cwd(), "content/about/index.md");

/** ローカル MD ファイルから About を読み込む（フォールバック用） */
function loadAboutFromLocal(): About | null {
  try {
    const raw = fs.readFileSync(ABOUT_FILE, "utf-8");
    const { data, content } = matter(raw);
    const statement = content.trim();
    if (!statement) return null;

    const photos = (
      (data.photos ?? []) as { src: string; width: number; height: number }[]
    )
      .filter((p) => p.src)
      .map((p) => ({ src: absoluteMediaSrc(p.src), width: p.width ?? 640, height: p.height ?? 420 }));

    const cv = ((data.cv ?? []) as { year: string; content: string }[])
      .filter((c) => c.content)
      .map((c) => ({ year: String(c.year ?? ""), content: c.content }));

    return { statement, photos, cv };
  } catch {
    return null;
  }
}

/** About データ取得
 *  1. CMS API → 2. ローカル MD → 3. フォールバック
 */
export async function getAbout(): Promise<About> {
  // 1. CMS API
  try {
    const item = await fetchCms<CmsAbout>("about.php");
    const statement = item.body?.trim() || (item.data.statement as string | undefined)?.trim();
    if (statement) {
      const photos = (
        (item.data.photos ?? []) as {
          src: string;
          width?: number;
          height?: number;
        }[]
      )
        .filter((p) => p.src)
        .map((p) => ({ src: absoluteMediaSrc(p.src), width: p.width ?? 640, height: p.height ?? 420 }));

      const cv = ((item.data.cv ?? []) as { year: string; content: string }[])
        .filter((c) => c.content)
        .map((c) => ({ year: String(c.year ?? ""), content: c.content }));

      return { statement, photos, cv };
    }
  } catch {
    // CMS 未到達時はフォールバックへ
  }

  // 2. ローカル MD ファイル
  const local = loadAboutFromLocal();
  if (local) return local;

  // 3. フォールバック
  return fallbackAbout;
}

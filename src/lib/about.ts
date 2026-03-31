/**
 * About データ取得
 *
 * content/about/index.md から gray-matter でパースして返す。
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { about as fallbackAbout } from "@/lib/mock";

/** About の型 */
export type About = {
  statement: string;
  photos: { src: string; width: number; height: number }[];
  cv: { year: string; content: string }[];
};

const ABOUT_FILE = path.join(process.cwd(), "content/about/index.md");

/** About データ取得（Markdownファイルから） */
export async function getAbout(): Promise<About> {
  try {
    const raw = fs.readFileSync(ABOUT_FILE, "utf-8");
    const { data, content } = matter(raw);

    const statement = content.trim();
    if (!statement) return fallbackAbout;

    const photos = ((data.photos ?? []) as { src: string; width: number; height: number }[])
      .filter((p) => p.src)
      .map((p) => ({
        src: p.src,
        width: p.width ?? 640,
        height: p.height ?? 420,
      }));

    const cv = ((data.cv ?? []) as { year: string; content: string }[])
      .filter((c) => c.content)
      .map((c) => ({
        year: String(c.year ?? ""),
        content: c.content,
      }));

    return { statement, photos, cv };
  } catch {
    /* ファイルが存在しない場合はフォールバック */
    return fallbackAbout;
  }
}

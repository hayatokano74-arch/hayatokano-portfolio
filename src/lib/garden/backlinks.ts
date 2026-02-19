/* バックリンクインデックス生成 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { titleToSlug } from "./slug";
import type { GardenFrontmatter, BacklinkEntry } from "./types";

const GARDEN_DIR = path.join(process.cwd(), "content", "garden");

/** ブラケットリンクの正規表現 */
const BRACKET_RE = /(?<!\!)\[([^\[\]]+?)\](?!\()/g;

interface RawLink {
  sourceSlug: string;
  sourceTitle: string;
  targetSlug: string;
  context: string;
}

/** 全ファイルをスキャンしてリンク関係を抽出 */
function scanAllLinks(): RawLink[] {
  if (!fs.existsSync(GARDEN_DIR)) return [];
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const links: RawLink[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(GARDEN_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as GardenFrontmatter;
    const sourceSlug = titleToSlug(fm.title);

    for (const match of content.matchAll(BRACKET_RE)) {
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);

      // リンクを含む段落を文脈として抽出
      const idx = match.index!;
      const lineStart = content.lastIndexOf("\n", idx) + 1;
      const lineEnd = content.indexOf("\n", idx + match[0].length);
      const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
      // ブラケットを除去して読みやすく
      const context = line.replace(/\[([^\]]+)\]/g, "$1");

      links.push({ sourceSlug, sourceTitle: fm.title, targetSlug, context });
    }
  }

  return links;
}

/** 特定slugに対するバックリンクを取得。React.cache()で重複排除 */
export const getBacklinks = cache((targetSlug: string): BacklinkEntry[] => {
  const allLinks = scanAllLinks();
  return allLinks
    .filter((link) => link.targetSlug === targetSlug && link.sourceSlug !== targetSlug)
    .map((link) => ({
      slug: link.sourceSlug,
      title: link.sourceTitle,
      context: link.context,
    }));
});

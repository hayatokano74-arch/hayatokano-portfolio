/* バックリンク・2-hopリンクインデックス生成 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { titleToSlug } from "./slug";
import type { GardenFrontmatter, BacklinkEntry, TwoHopGroup } from "./types";

const GARDEN_DIR = path.join(process.cwd(), "content", "garden");

/** ブラケットリンクとハッシュタグの正規表現 */
const BRACKET_RE = /(?<!\!)\[([^\[\]]+?)\](?!\()/g;
const HASHTAG_RE = /(?:^|(?<=\s))#([\p{L}\p{N}_-]+)/gu;

interface RawLink {
  sourceSlug: string;
  sourceTitle: string;
  targetSlug: string;
  targetTitle: string;
  context: string;
}

/** 全ファイルをスキャンしてリンク関係を抽出（ブラケットリンク + ハッシュタグ） */
const scanAllLinks = cache((): RawLink[] => {
  if (!fs.existsSync(GARDEN_DIR)) return [];
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const links: RawLink[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(GARDEN_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as GardenFrontmatter;
    const sourceSlug = titleToSlug(fm.title);

    // ブラケットリンク [テキスト]
    for (const match of content.matchAll(BRACKET_RE)) {
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      const context = extractContext(content, match.index!, match[0].length);
      links.push({ sourceSlug, sourceTitle: fm.title, targetSlug, targetTitle, context });
    }

    // ハッシュタグ #タグ（ページリンクとして扱う）
    for (const match of content.matchAll(HASHTAG_RE)) {
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      const context = extractContext(content, match.index!, match[0].length);
      links.push({ sourceSlug, sourceTitle: fm.title, targetSlug, targetTitle, context });
    }
  }

  return links;
});

/** リンクを含む行を文脈として抽出 */
function extractContext(content: string, idx: number, matchLen: number): string {
  const lineStart = content.lastIndexOf("\n", idx) + 1;
  const lineEnd = content.indexOf("\n", idx + matchLen);
  const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
  return line
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/(?:^|(?<=\s))#([\p{L}\p{N}_-]+)/gu, "$1");
}

/** 特定slugに対するバックリンクを取得 */
export const getBacklinks = cache((targetSlug: string): BacklinkEntry[] => {
  const allLinks = scanAllLinks();
  // 同じソースからの重複を排除
  const seen = new Set<string>();
  return allLinks
    .filter((link) => link.targetSlug === targetSlug && link.sourceSlug !== targetSlug)
    .filter((link) => {
      if (seen.has(link.sourceSlug)) return false;
      seen.add(link.sourceSlug);
      return true;
    })
    .map((link) => ({
      slug: link.sourceSlug,
      title: link.sourceTitle,
      context: link.context,
    }));
});

/**
 * Cosense方式の2-hopリンクを取得。
 * 現在のページが持つリンク先（forward links）ごとに、
 * 同じリンク先を共有する他のページをグループ化して返す。
 *
 * 例: 「石巻の朝」→ [写真と記憶] で、
 * 「冬の光」も→ [写真と記憶] なら、
 * グループ「写真と記憶」の下に「冬の光」が表示される。
 */
export const getTwoHopLinks = cache((currentSlug: string): TwoHopGroup[] => {
  const allLinks = scanAllLinks();

  // 現在ページからのリンク先一覧（slug → title のマッピング）
  const forwardLinks = new Map<string, string>();
  for (const link of allLinks) {
    if (link.sourceSlug === currentSlug && link.targetSlug !== currentSlug) {
      if (!forwardLinks.has(link.targetSlug)) {
        forwardLinks.set(link.targetSlug, link.targetTitle);
      }
    }
  }

  // 各リンク先について、同じリンク先を持つ他のページを収集
  const groups: TwoHopGroup[] = [];
  for (const [targetSlug, targetTitle] of forwardLinks) {
    const seen = new Set<string>();
    const pages: { slug: string; title: string }[] = [];

    for (const link of allLinks) {
      // 同じターゲットにリンクしている他のページを収集
      if (
        link.targetSlug === targetSlug &&
        link.sourceSlug !== currentSlug &&
        !seen.has(link.sourceSlug)
      ) {
        seen.add(link.sourceSlug);
        pages.push({ slug: link.sourceSlug, title: link.sourceTitle });
      }
    }

    // 関連ページがあるグループのみ追加
    if (pages.length > 0) {
      groups.push({
        via: targetTitle,
        viaSlug: targetSlug,
        pages,
      });
    }
  }

  return groups;
});

/**
 * 全リンクターゲットのslugセットを取得。
 * MDファイルが存在しない仮想ページも含む。
 */
export const getAllLinkedSlugs = cache((): Map<string, string> => {
  const allLinks = scanAllLinks();
  const slugToTitle = new Map<string, string>();
  for (const link of allLinks) {
    if (!slugToTitle.has(link.targetSlug)) {
      slugToTitle.set(link.targetSlug, link.targetTitle);
    }
  }
  return slugToTitle;
});

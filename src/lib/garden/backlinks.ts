/* バックリンク・2-hopリンクインデックス生成 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { titleToSlug } from "./slug";
import type { GardenFrontmatter, BacklinkEntry, TwoHopEntry } from "./types";

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
 * 2-hopリンクを取得。
 * ページBから見て:
 * - A→B のバックリンク元 A が持つ他のリンク先 C
 * - B→D のリンク先 D にリンクしている他のページ E
 * これらが2-hopリンク。
 */
export const getTwoHopLinks = cache((currentSlug: string): TwoHopEntry[] => {
  const allLinks = scanAllLinks();

  // currentSlug にリンクしているページ（バックリンク元）
  const backlinkSlugs = new Set(
    allLinks
      .filter((l) => l.targetSlug === currentSlug && l.sourceSlug !== currentSlug)
      .map((l) => l.sourceSlug),
  );

  // currentSlug がリンクしているページ
  const forwardSlugs = new Set(
    allLinks
      .filter((l) => l.sourceSlug === currentSlug && l.targetSlug !== currentSlug)
      .map((l) => l.targetSlug),
  );

  const results = new Map<string, TwoHopEntry>();

  // パターン1: A→current, A→C → Cは2-hop（経由: A）
  for (const link of allLinks) {
    if (
      backlinkSlugs.has(link.sourceSlug) &&
      link.targetSlug !== currentSlug &&
      !backlinkSlugs.has(link.targetSlug) &&
      !forwardSlugs.has(link.targetSlug) &&
      !results.has(link.targetSlug)
    ) {
      results.set(link.targetSlug, {
        slug: link.targetSlug,
        title: link.targetTitle,
        via: link.sourceTitle,
      });
    }
  }

  // パターン2: current→D, E→D → Eは2-hop（経由: D）
  for (const link of allLinks) {
    if (
      forwardSlugs.has(link.targetSlug) &&
      link.sourceSlug !== currentSlug &&
      !backlinkSlugs.has(link.sourceSlug) &&
      !forwardSlugs.has(link.sourceSlug) &&
      !results.has(link.sourceSlug)
    ) {
      results.set(link.sourceSlug, {
        slug: link.sourceSlug,
        title: link.sourceTitle,
        via: link.targetTitle,
      });
    }
  }

  return [...results.values()];
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

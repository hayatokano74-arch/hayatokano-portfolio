/* リンクインデックス生成（Cosense方式）— Dropbox API 経由 */

import matter from "gray-matter";
import { cache } from "react";
import { titleToSlug } from "./slug";
import { getGardenFiles, getNodeSummaryMap } from "./reader";
import type { GardenFrontmatter, LinkedPageSummary, TwoHopGroup } from "./types";

/** リンク構文の正規表現 */
const WIKILINK_RE = /\[\[([^\[\]|]+?)(?:\|[^\[\]]+?)?\]\]/g;
const BRACKET_RE = /(?<!\!)\[([^\[\]]+?)\](?!\()/g;
const HASHTAG_RE = /(?:^|(?<=\s))#([\p{L}\p{N}_-]+)/gu;

interface RawLink {
  sourceSlug: string;
  sourceTitle: string;
  targetSlug: string;
  targetTitle: string;
}

/** 全ファイルをスキャンしてリンク関係を抽出（ブラケットリンク + ハッシュタグ） */
const scanAllLinks = cache(async (): Promise<RawLink[]> => {
  const files = await getGardenFiles();
  const links: RawLink[] = [];

  for (const file of files) {
    const { data, content } = matter(file.content);
    const fm = data as GardenFrontmatter;
    const sourceTitle = fm.title || file.filename.replace(/\.md$/, "");
    const sourceSlug = titleToSlug(sourceTitle);

    // Obsidian式 [[wikilink]]
    const wikilinkPositions = new Set<number>();
    for (const match of content.matchAll(WIKILINK_RE)) {
      wikilinkPositions.add(match.index!);
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle, targetSlug, targetTitle });
    }

    // ブラケットリンク [テキスト]
    for (const match of content.matchAll(BRACKET_RE)) {
      if (wikilinkPositions.has(match.index! - 1)) continue;
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle, targetSlug, targetTitle });
    }

    // ハッシュタグ #タグ
    for (const match of content.matchAll(HASHTAG_RE)) {
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle, targetSlug, targetTitle });
    }
  }

  return links;
});

/** slug → LinkedPageSummary に変換 */
function toPageSummary(
  slug: string,
  title: string,
  summaryMap: Map<string, { title: string; excerpt?: string; date?: string }>,
): LinkedPageSummary {
  const data = summaryMap.get(slug);
  return {
    slug,
    title: data?.title ?? title,
    excerpt: data?.excerpt,
    date: data?.date,
  };
}

/**
 * Cosense方式のLinks（1-hop）を取得。
 */
export const getLinkedPages = cache(async (currentSlug: string): Promise<LinkedPageSummary[]> => {
  const allLinks = await scanAllLinks();
  const summaryMap = await getNodeSummaryMap();
  const seen = new Set<string>();
  seen.add(currentSlug);
  const results: LinkedPageSummary[] = [];

  // forward linksのターゲットを収集
  const forwardTargets = new Set<string>();
  for (const link of allLinks) {
    if (link.sourceSlug === currentSlug && link.targetSlug !== currentSlug) {
      forwardTargets.add(link.targetSlug);
    }
  }

  // 各forward linkターゲットを共有する他のページを収集
  for (const link of allLinks) {
    if (
      forwardTargets.has(link.targetSlug) &&
      link.sourceSlug !== currentSlug &&
      !seen.has(link.sourceSlug)
    ) {
      seen.add(link.sourceSlug);
      results.push(toPageSummary(link.sourceSlug, link.sourceTitle, summaryMap));
    }
  }

  // backlinks: 現在ページに直接リンクしているページ
  for (const link of allLinks) {
    if (link.targetSlug === currentSlug && !seen.has(link.sourceSlug)) {
      seen.add(link.sourceSlug);
      results.push(toPageSummary(link.sourceSlug, link.sourceTitle, summaryMap));
    }
  }

  return results;
});

/**
 * Cosense方式の2-hopリンクを取得。
 */
export const getTwoHopLinks = cache(async (currentSlug: string): Promise<TwoHopGroup[]> => {
  const allLinks = await scanAllLinks();
  const summaryMap = await getNodeSummaryMap();

  const linkedPages = await getLinkedPages(currentSlug);
  const linkedSlugs = new Set<string>(linkedPages.map((p) => p.slug));
  linkedSlugs.add(currentSlug);

  const hopTargets = new Map<string, string>();
  for (const page of linkedPages) {
    for (const link of allLinks) {
      if (
        link.sourceSlug === page.slug &&
        link.targetSlug !== currentSlug &&
        !linkedSlugs.has(link.targetSlug) &&
        !hopTargets.has(link.targetSlug)
      ) {
        hopTargets.set(link.targetSlug, link.targetTitle);
      }
    }
  }

  const groups: TwoHopGroup[] = [];
  for (const [targetSlug, targetTitle] of hopTargets) {
    const seen = new Set<string>();
    const pages: LinkedPageSummary[] = [];

    for (const link of allLinks) {
      if (
        link.targetSlug === targetSlug &&
        !linkedSlugs.has(link.sourceSlug) &&
        !seen.has(link.sourceSlug)
      ) {
        seen.add(link.sourceSlug);
        pages.push(toPageSummary(link.sourceSlug, link.sourceTitle, summaryMap));
      }
    }

    if (pages.length > 0) {
      groups.push({
        via: summaryMap.get(targetSlug)?.title ?? targetTitle,
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
export const getAllLinkedSlugs = cache(async (): Promise<Map<string, string>> => {
  const allLinks = await scanAllLinks();
  const slugToTitle = new Map<string, string>();
  for (const link of allLinks) {
    if (!slugToTitle.has(link.targetSlug)) {
      slugToTitle.set(link.targetSlug, link.targetTitle);
    }
  }
  return slugToTitle;
});

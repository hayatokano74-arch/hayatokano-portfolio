/* リンクインデックス生成（Cosense方式） */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { titleToSlug } from "./slug";
import { getNodeSummaryMap } from "./reader";
import type { GardenFrontmatter, LinkedPageSummary, TwoHopGroup } from "./types";

const GARDEN_DIR = path.join(process.cwd(), "content", "garden");

/** ブラケットリンクとハッシュタグの正規表現 */
const BRACKET_RE = /(?<!\!)\[([^\[\]]+?)\](?!\()/g;
const HASHTAG_RE = /(?:^|(?<=\s))#([\p{L}\p{N}_-]+)/gu;

interface RawLink {
  sourceSlug: string;
  sourceTitle: string;
  targetSlug: string;
  targetTitle: string;
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
      links.push({ sourceSlug, sourceTitle: fm.title, targetSlug, targetTitle });
    }

    // ハッシュタグ #タグ（ページリンクとして扱う）
    for (const match of content.matchAll(HASHTAG_RE)) {
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle: fm.title, targetSlug, targetTitle });
    }
  }

  return links;
});

/** slug → LinkedPageSummary に変換（ページデータがあれば抜粋付き） */
function toPageSummary(
  slug: string,
  title: string,
  summaryMap: Map<string, { title: string; excerpt?: string }>,
): LinkedPageSummary {
  const data = summaryMap.get(slug);
  return {
    slug,
    title: data?.title ?? title,
    excerpt: data?.excerpt,
  };
}

/**
 * Cosense方式のLinks（1-hop）を取得。
 * forward links（ページ内のリンク先）+ backlinks（被リンク元）を
 * 区別なく混在して返す。各ページのexcerpt付き。
 */
export const getLinkedPages = cache((currentSlug: string): LinkedPageSummary[] => {
  const allLinks = scanAllLinks();
  const summaryMap = getNodeSummaryMap();
  const seen = new Set<string>();
  const results: LinkedPageSummary[] = [];

  // forward links: 現在ページ → ターゲット
  for (const link of allLinks) {
    if (link.sourceSlug === currentSlug && link.targetSlug !== currentSlug && !seen.has(link.targetSlug)) {
      seen.add(link.targetSlug);
      results.push(toPageSummary(link.targetSlug, link.targetTitle, summaryMap));
    }
  }

  // backlinks: ソース → 現在ページ
  for (const link of allLinks) {
    if (link.targetSlug === currentSlug && link.sourceSlug !== currentSlug && !seen.has(link.sourceSlug)) {
      seen.add(link.sourceSlug);
      results.push(toPageSummary(link.sourceSlug, link.sourceTitle, summaryMap));
    }
  }

  return results;
});

/**
 * Cosense方式の2-hopリンクを取得。
 * 現在ページのforward links（リンク先）ごとに、
 * 同じリンク先を共有する他のページをグループ化して返す。
 */
export const getTwoHopLinks = cache((currentSlug: string): TwoHopGroup[] => {
  const allLinks = scanAllLinks();
  const summaryMap = getNodeSummaryMap();

  // 1-hopで直接つながっているページ（Links表示済み）を除外用に収集
  const directSlugs = new Set<string>();
  for (const link of allLinks) {
    if (link.sourceSlug === currentSlug && link.targetSlug !== currentSlug) {
      directSlugs.add(link.targetSlug);
    }
    if (link.targetSlug === currentSlug && link.sourceSlug !== currentSlug) {
      directSlugs.add(link.sourceSlug);
    }
  }

  // 現在ページからのforward links一覧（中継ページ候補）
  const forwardLinks = new Map<string, string>();
  for (const link of allLinks) {
    if (link.sourceSlug === currentSlug && link.targetSlug !== currentSlug) {
      if (!forwardLinks.has(link.targetSlug)) {
        forwardLinks.set(link.targetSlug, link.targetTitle);
      }
    }
  }

  // 各forward linkについて、同じリンク先を持つ他のページを収集
  const groups: TwoHopGroup[] = [];
  for (const [targetSlug, targetTitle] of forwardLinks) {
    const seen = new Set<string>();
    const pages: LinkedPageSummary[] = [];

    for (const link of allLinks) {
      if (
        link.targetSlug === targetSlug &&
        link.sourceSlug !== currentSlug &&
        !directSlugs.has(link.sourceSlug) &&
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

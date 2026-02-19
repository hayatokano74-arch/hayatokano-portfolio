/* リンクインデックス生成（Cosense方式） */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { titleToSlug } from "./slug";
import { getNodeSummaryMap } from "./reader";
import type { GardenFrontmatter, LinkedPageSummary, TwoHopGroup } from "./types";

const GARDEN_DIR = path.join(process.cwd(), "content", "garden");

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
const scanAllLinks = cache((): RawLink[] => {
  if (!fs.existsSync(GARDEN_DIR)) return [];
  const files = fs.readdirSync(GARDEN_DIR).filter((f) => f.endsWith(".md"));
  const links: RawLink[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(GARDEN_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as GardenFrontmatter;
    const sourceSlug = titleToSlug(fm.title);

    // Obsidian式 [[wikilink]]（[[ページ|表示名]] のページ部分を使用）
    const wikilinkPositions = new Set<number>();
    for (const match of content.matchAll(WIKILINK_RE)) {
      wikilinkPositions.add(match.index!);
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle: fm.title, targetSlug, targetTitle });
    }

    // ブラケットリンク [テキスト]（wikilink内の [ ] と重複しないようスキップ）
    for (const match of content.matchAll(BRACKET_RE)) {
      // [[wikilink]] の内側の [テキスト] はスキップ
      if (wikilinkPositions.has(match.index! - 1)) continue;
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

/** slug → LinkedPageSummary に変換（ページデータがあれば抜粋・日付付き） */
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
 * 現在ページのリンク先を共有する他のページ + 被リンク元を
 * ページカード（タイトル + 抜粋）として返す。
 *
 * 例: 石巻の朝 → [写真と記憶] で、冬の光も → [写真と記憶] なら、
 *     冬の光がリンクカードとして表示される。
 */
export const getLinkedPages = cache((currentSlug: string): LinkedPageSummary[] => {
  const allLinks = scanAllLinks();
  const summaryMap = getNodeSummaryMap();
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
 * Linksセクションで表示済みのページを除外し、
 * さらに遠い関連ページをグループ化して返す。
 */
export const getTwoHopLinks = cache((currentSlug: string): TwoHopGroup[] => {
  const allLinks = scanAllLinks();
  const summaryMap = getNodeSummaryMap();

  // Linksセクションで表示済みのページを除外用に収集
  const linkedPages = getLinkedPages(currentSlug);
  const linkedSlugs = new Set<string>(linkedPages.map((p) => p.slug));
  linkedSlugs.add(currentSlug);

  // Linksに表示されたページのforward linksを中継候補として収集
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

  // 各中継ターゲットを共有する、まだ表示されていないページを収集
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

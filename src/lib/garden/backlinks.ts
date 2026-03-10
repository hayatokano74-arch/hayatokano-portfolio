/* リンクインデックス生成（Cosense方式）— Dropbox API 経由 */

import fs from "fs";
import path from "path";
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

// ============================================================
// リンクキャッシュ（ビルド時に生成、ランタイムで読み取り）
// ============================================================
const LINKS_CACHE_PATH = path.join(process.cwd(), ".garden-links-cache.json");
const LINKS_TMP_CACHE_PATH = "/tmp/garden-links-cache.json";

/** undefined = 未読, null = キャッシュファイル不在, RawLink[] = 読み込み済み */
let _linksCache: RawLink[] | null | undefined = undefined;

/** リンクキャッシュを読み込む（0件でも有効なキャッシュとして扱う） */
function readLinksCache(): RawLink[] | null {
  for (const p of [LINKS_CACHE_PATH, LINKS_TMP_CACHE_PATH]) {
    try {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, "utf-8")) as RawLink[];
        console.log(`[Garden] リンクキャッシュ読み込み: ${data.length} リンク ← ${p}`);
        return data;
      }
    } catch { continue; }
  }
  return null;
}

/** リンクキャッシュを保存（prebuildスクリプトから呼ぶ） */
export function writeLinksCache(links: RawLink[]): void {
  const json = JSON.stringify(links);
  try { fs.writeFileSync(LINKS_CACHE_PATH, json, "utf-8"); } catch {}
  try { fs.writeFileSync(LINKS_TMP_CACHE_PATH, json, "utf-8"); } catch {}
}

/** 全ファイルをスキャンしてリンク関係を抽出（ブラケットリンク + ハッシュタグ） */
const scanAllLinks = cache(async (): Promise<RawLink[]> => {
  /* キャッシュがあればスキャンをスキップ（0件でもキャッシュ有効） */
  if (_linksCache === undefined) {
    _linksCache = readLinksCache();
  }
  if (_linksCache !== null) return _linksCache;

  /* キャッシュなし: 従来通りファイルをスキャン */
  const files = await getGardenFiles();
  const links: RawLink[] = [];

  for (const file of files) {
    const { data, content } = matter(file.content);
    const fm = data as GardenFrontmatter;
    const sourceTitle = fm.title || file.filename.replace(/\.md$/, "");
    const sourceSlug = titleToSlug(sourceTitle);

    const wikilinkPositions = new Set<number>();
    for (const match of content.matchAll(WIKILINK_RE)) {
      wikilinkPositions.add(match.index!);
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle, targetSlug, targetTitle });
    }

    for (const match of content.matchAll(BRACKET_RE)) {
      if (wikilinkPositions.has(match.index! - 1)) continue;
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle, targetSlug, targetTitle });
    }

    for (const match of content.matchAll(HASHTAG_RE)) {
      const targetTitle = match[1];
      const targetSlug = titleToSlug(targetTitle);
      links.push({ sourceSlug, sourceTitle, targetSlug, targetTitle });
    }
  }

  return links;
});

/**
 * プリビルド用: リンクをスキャンしてキャッシュに保存する。
 * prebuild-garden-nodes.ts から呼ばれる。
 */
export async function scanAllLinksForPrebuild(): Promise<RawLink[]> {
  /* キャッシュを無視してファイルから直接スキャン */
  const { getGardenFiles: getFiles } = await import("./reader");
  const files = await getFiles();
  const links: RawLink[] = [];

  for (const file of files) {
    const { data, content } = matter(file.content);
    const fm = data as GardenFrontmatter;
    const sourceTitle = fm.title || file.filename.replace(/\.md$/, "");
    const sourceSlug = titleToSlug(sourceTitle);

    const wikilinkPositions = new Set<number>();
    for (const match of content.matchAll(WIKILINK_RE)) {
      wikilinkPositions.add(match.index!);
      links.push({ sourceSlug, sourceTitle, targetSlug: titleToSlug(match[1]), targetTitle: match[1] });
    }
    for (const match of content.matchAll(BRACKET_RE)) {
      if (wikilinkPositions.has(match.index! - 1)) continue;
      links.push({ sourceSlug, sourceTitle, targetSlug: titleToSlug(match[1]), targetTitle: match[1] });
    }
    for (const match of content.matchAll(HASHTAG_RE)) {
      links.push({ sourceSlug, sourceTitle, targetSlug: titleToSlug(match[1]), targetTitle: match[1] });
    }
  }

  writeLinksCache(links);
  return links;
}

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

/* [テキスト] と #タグ を /garden/slug ページリンクに変換する remark プラグイン */

import type { Root, PhrasingContent } from "mdast";
import type { Plugin } from "unified";
import { titleToSlug } from "./slug";

/** Obsidian式wikilink: [[テキスト]] または [[ページ|表示名]] */
const WIKILINK_RE = /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]/g;

/** ブラケットリンク: [テキスト]（Cosense/Scrapbox式） */
const BRACKET_RE = /(?<!\!)\[([^\[\]]+?)\](?!\()/g;

/** ハッシュタグ: #タグ（ページリンクとして扱う） */
const HASHTAG_RE = /(?:^|(?<=\s))#([\p{L}\p{N}_-]+)/gu;

interface Options {
  /** 存在するノードのslugセット（MDファイルがあるもの） */
  existingSlugs: Set<string>;
}

interface LinkMatch {
  index: number;
  length: number;
  html: string;
}

export const remarkBracketLinks: Plugin<[Options], Root> = (options) => {
  const { existingSlugs } = options;

  return (tree) => {
    visitText(tree);
  };

  function visitText(node: { children?: Array<{ type: string; value?: string; children?: Array<{ type: string }> }> }) {
    if (!node.children) return;

    const newChildren: unknown[] = [];
    for (const child of node.children) {
      if (child.type === "text" && typeof child.value === "string") {
        const parts = splitGardenLinks(child.value);
        newChildren.push(...parts);
      } else {
        if (child.children) {
          visitText(child as typeof node);
        }
        newChildren.push(child);
      }
    }
    (node as { children: unknown[] }).children = newChildren;
  }

  function splitGardenLinks(text: string): PhrasingContent[] {
    const matches: LinkMatch[] = [];

    // Obsidian式 [[wikilink]] → ページリンク（[[ページ|表示名]] もサポート）
    for (const m of text.matchAll(WIKILINK_RE)) {
      const page = m[1];
      const display = m[2] ?? page;
      const slug = titleToSlug(page);
      matches.push({
        index: m.index!,
        length: m[0].length,
        html: `<a href="/garden/${encodeURIComponent(slug)}" class="garden-link${existingSlugs.has(slug) ? "" : " garden-link-empty"}">${esc(display)}</a>`,
      });
    }

    // ブラケットリンク [テキスト] → ページリンク（Cosense/Scrapbox式）
    for (const m of text.matchAll(BRACKET_RE)) {
      // wikilink [[]] と重複する場合はスキップ
      if (matches.some((prev) => m.index! >= prev.index && m.index! < prev.index + prev.length)) continue;
      const title = m[1];
      const slug = titleToSlug(title);
      matches.push({
        index: m.index!,
        length: m[0].length,
        html: `<a href="/garden/${encodeURIComponent(slug)}" class="garden-link${existingSlugs.has(slug) ? "" : " garden-link-empty"}">${esc(title)}</a>`,
      });
    }

    // ハッシュタグ #タグ → 同じページリンク（表示だけ # 付き）
    for (const m of text.matchAll(HASHTAG_RE)) {
      const tag = m[1];
      const slug = titleToSlug(tag);
      matches.push({
        index: m.index!,
        length: m[0].length,
        html: `<a href="/garden/${encodeURIComponent(slug)}" class="garden-hashtag${existingSlugs.has(slug) ? "" : " garden-link-empty"}">#${esc(tag)}</a>`,
      });
    }

    if (matches.length === 0) {
      return [{ type: "text", value: text }];
    }

    matches.sort((a, b) => a.index - b.index);

    const result: PhrasingContent[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      if (match.index < lastIndex) continue;
      if (match.index > lastIndex) {
        result.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      result.push({ type: "html", value: match.html } as PhrasingContent);
      lastIndex = match.index + match.length;
    }

    if (lastIndex < text.length) {
      result.push({ type: "text", value: text.slice(lastIndex) });
    }

    return result;
  }
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

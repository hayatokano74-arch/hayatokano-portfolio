/* [テキスト] と #タグ を Garden リンクに変換する remark プラグイン */

import type { Root, PhrasingContent } from "mdast";
import type { Plugin } from "unified";
import { titleToSlug } from "./slug";

/**
 * ブラケットリンク: `[テキスト]` にマッチ
 * - `[text](url)` (標準リンク) と `![alt](url)` (画像) は除外
 */
const BRACKET_RE = /(?<!\!)\[([^\[\]]+?)\](?!\()/g;

/**
 * ハッシュタグ: `#タグ` にマッチ
 * - 先頭 or 空白の直後に `#` + 1文字以上の単語文字
 * - Markdown見出し `# ` (スペース付き) は除外される（テキストノード内では見出し構文は出現しない）
 */
const HASHTAG_RE = /(?:^|(?<=\s))#([\p{L}\p{N}_-]+)/gu;

interface Options {
  /** 存在するノードのslugセット */
  existingSlugs: Set<string>;
}

/** ブラケットリンク or ハッシュタグのマッチ情報 */
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

  /** ブラケットリンクとハッシュタグを統合的にパースする */
  function splitGardenLinks(text: string): PhrasingContent[] {
    // 全マッチを収集してインデックス順にソート
    const matches: LinkMatch[] = [];

    for (const m of text.matchAll(BRACKET_RE)) {
      const title = m[1];
      const slug = titleToSlug(title);
      const exists = existingSlugs.has(slug);
      matches.push({
        index: m.index!,
        length: m[0].length,
        html: exists
          ? `<a href="/garden/${encodeURIComponent(slug)}" class="garden-link">${esc(title)}</a>`
          : `<a class="garden-link garden-link-broken">${esc(title)}</a>`,
      });
    }

    for (const m of text.matchAll(HASHTAG_RE)) {
      const tag = m[1];
      matches.push({
        index: m.index!,
        length: m[0].length,
        html: `<a href="/garden?tag=${encodeURIComponent(tag)}" class="garden-hashtag">#${esc(tag)}</a>`,
      });
    }

    if (matches.length === 0) {
      return [{ type: "text", value: text }];
    }

    // インデックス順にソート
    matches.sort((a, b) => a.index - b.index);

    const result: PhrasingContent[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      // 重複マッチ（ブラケット内のハッシュタグ等）をスキップ
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

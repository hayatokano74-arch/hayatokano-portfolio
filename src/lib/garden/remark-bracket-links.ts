/* [テキスト] 形式のブラケットリンクを /garden/slug リンクに変換する remark プラグイン */

import type { Root, Text, PhrasingContent } from "mdast";
import type { Plugin } from "unified";
import { titleToSlug } from "./slug";

/**
 * ブラケットリンク正規表現:
 * - `[テキスト]` にマッチ
 * - `[text](url)` (標準リンク) と `![alt](url)` (画像) は除外
 */
const BRACKET_RE = /(?<!\!)\[([^\[\]]+?)\](?!\()/g;

interface Options {
  /** 存在するノードのslugセット */
  existingSlugs: Set<string>;
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
        const parts = splitBracketLinks(child.value);
        newChildren.push(...parts);
      } else {
        // 再帰的に子ノードを処理
        if (child.children) {
          visitText(child as typeof node);
        }
        newChildren.push(child);
      }
    }
    (node as { children: unknown[] }).children = newChildren;
  }

  function splitBracketLinks(text: string): PhrasingContent[] {
    const result: PhrasingContent[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(BRACKET_RE)) {
      const fullMatch = match[0];
      const title = match[1];
      const start = match.index!;

      // マッチ前のテキスト
      if (start > lastIndex) {
        result.push({ type: "text", value: text.slice(lastIndex, start) });
      }

      const slug = titleToSlug(title);
      const exists = existingSlugs.has(slug);

      result.push({
        type: "html",
        value: exists
          ? `<a href="/garden/${encodeURIComponent(slug)}" class="garden-link">${escapeHtml(title)}</a>`
          : `<a class="garden-link garden-link-broken">${escapeHtml(title)}</a>`,
      } as PhrasingContent);

      lastIndex = start + fullMatch.length;
    }

    // 残りのテキスト
    if (lastIndex < text.length) {
      result.push({ type: "text", value: text.slice(lastIndex) });
    }

    return result.length > 0 ? result : [{ type: "text", value: text }];
  }
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

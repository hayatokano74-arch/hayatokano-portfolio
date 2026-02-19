"use client";

/**
 * Garden 検索フック
 * MiniSearch を使ったクライアントサイド検索。
 * - QuickSearch: タイトル＋タグのprefix一致（入力中）
 * - FullSearch: 全フィールドのfuzzy検索（Enter押下時）
 * - `-keyword` で除外検索対応
 */

import { useState, useEffect, useCallback, useRef } from "react";
import MiniSearch, { type SearchResult } from "minisearch";

export interface SearchDoc {
  id: string;
  title: string;
  date: string;
  type: string;
  tags: string[];
  body: string;
}

export interface GardenSearchResult {
  id: string;
  title: string;
  date: string;
  type: string;
  tags: string[];
  /** 全文検索時のマッチ抜粋（QuickSearchでは空） */
  snippet: string;
  score: number;
}

/** 日本語bigram トークナイザー */
function bigramTokenize(text: string): string[] {
  const tokens: string[] = [];
  // ASCII語はスペース分割
  const asciiWords = text.match(/[a-zA-Z0-9]+/g) ?? [];
  tokens.push(...asciiWords.map((w) => w.toLowerCase()));
  // 日本語文字をbigram
  const cjk = text.replace(/[a-zA-Z0-9\s\-_.,!?#@"'()[\]{}]/g, "");
  for (let i = 0; i < cjk.length - 1; i++) {
    tokens.push(cjk.slice(i, i + 2));
  }
  // 単一CJK文字もインデックス（1文字検索対応）
  for (const ch of cjk) {
    tokens.push(ch);
  }
  return tokens;
}

/** 検索クエリを解析して、通常ワードと除外ワードに分離 */
function parseQuery(query: string): { terms: string; excludes: string[] } {
  const parts = query.split(/\s+/);
  const excludes: string[] = [];
  const terms: string[] = [];
  for (const part of parts) {
    if (part.startsWith("-") && part.length > 1) {
      excludes.push(part.slice(1).toLowerCase());
    } else if (part.length > 0) {
      terms.push(part);
    }
  }
  return { terms: terms.join(" "), excludes };
}

/** 検索結果から除外ワードにマッチするものをフィルタ */
function applyExcludes(results: SearchResult[], excludes: string[], docs: Map<string, SearchDoc>): SearchResult[] {
  if (excludes.length === 0) return results;
  return results.filter((r) => {
    const doc = docs.get(r.id as string);
    if (!doc) return false;
    const haystack = `${doc.title} ${doc.tags.join(" ")} ${doc.body}`.toLowerCase();
    return !excludes.some((ex) => haystack.includes(ex));
  });
}

/** body テキストからマッチ箇所周辺を抜粋 */
function extractSnippet(body: string, query: string, maxLen = 120): string {
  const q = query.toLowerCase();
  const lower = body.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) {
    // bigram で部分一致を試みる
    const tokens = bigramTokenize(q);
    for (const t of tokens) {
      const ti = lower.indexOf(t);
      if (ti !== -1) {
        const start = Math.max(0, ti - 30);
        const end = Math.min(body.length, ti + maxLen - 30);
        return (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
      }
    }
    return body.slice(0, maxLen) + (body.length > maxLen ? "…" : "");
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(body.length, idx + maxLen - 30);
  return (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
}

/** MiniSearch インデックス用（tags を文字列に結合した型） */
interface IndexDoc {
  id: string;
  title: string;
  date: string;
  type: string;
  tags: string;
  body: string;
}

export function useGardenSearch() {
  const [ready, setReady] = useState(false);
  const [quickResults, setQuickResults] = useState<GardenSearchResult[]>([]);
  const [fullResults, setFullResults] = useState<GardenSearchResult[] | null>(null);
  const miniRef = useRef<MiniSearch<IndexDoc> | null>(null);
  const docsRef = useRef<Map<string, SearchDoc>>(new Map());

  // インデックス読み込み
  useEffect(() => {
    let cancelled = false;
    fetch("/garden-search-index.json")
      .then((res) => res.json())
      .then((docs: SearchDoc[]) => {
        if (cancelled) return;

        const ms = new MiniSearch<IndexDoc>({
          fields: ["title", "tags", "body"],
          storeFields: ["title", "date", "type", "tags"],
          tokenize: bigramTokenize,
          searchOptions: {
            tokenize: bigramTokenize,
          },
        });

        const indexDocs: IndexDoc[] = docs.map((d) => ({
          ...d,
          tags: d.tags.join(" "),
        }));
        ms.addAll(indexDocs);

        // 元のドキュメントをMapに保存（snippet生成用）
        const docMap = new Map<string, SearchDoc>();
        for (const d of docs) {
          docMap.set(d.id, d);
        }

        miniRef.current = ms;
        docsRef.current = docMap;
        setReady(true);
      })
      .catch(() => {
        // インデックス取得失敗時は検索を無効化（静かに）
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** QuickSearch: タイトル＋タグのprefix一致 */
  const quickSearch = useCallback((query: string) => {
    if (!miniRef.current || !query.trim()) {
      setQuickResults([]);
      return;
    }
    const { terms, excludes } = parseQuery(query);
    if (!terms) {
      setQuickResults([]);
      return;
    }
    const raw = miniRef.current.search(terms, {
      fields: ["title", "tags"],
      prefix: true,
      fuzzy: 0.2,
    });
    const filtered = applyExcludes(raw, excludes, docsRef.current);
    setQuickResults(
      filtered.slice(0, 8).map((r) => ({
        id: r.id as string,
        title: (r as unknown as SearchDoc).title ?? (r.id as string),
        date: (r as unknown as SearchDoc).date ?? "",
        type: (r as unknown as SearchDoc).type ?? "note",
        tags: ((r as unknown as SearchDoc).tags as unknown as string)?.split(" ").filter(Boolean) ?? [],
        snippet: "",
        score: r.score,
      })),
    );
  }, []);

  /** FullSearch: 全フィールドのfuzzy検索 */
  const fullSearch = useCallback((query: string) => {
    if (!miniRef.current || !query.trim()) {
      setFullResults(null);
      return;
    }
    const { terms, excludes } = parseQuery(query);
    if (!terms) {
      setFullResults(null);
      return;
    }
    const raw = miniRef.current.search(terms, {
      fields: ["title", "tags", "body"],
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 3, tags: 2, body: 1 },
    });
    const filtered = applyExcludes(raw, excludes, docsRef.current);
    setFullResults(
      filtered.map((r) => {
        const doc = docsRef.current.get(r.id as string);
        return {
          id: r.id as string,
          title: (r as unknown as SearchDoc).title ?? (r.id as string),
          date: (r as unknown as SearchDoc).date ?? "",
          type: (r as unknown as SearchDoc).type ?? "note",
          tags: ((r as unknown as SearchDoc).tags as unknown as string)?.split(" ").filter(Boolean) ?? [],
          snippet: doc ? extractSnippet(doc.body, terms) : "",
          score: r.score,
        };
      }),
    );
  }, []);

  /** 検索状態をリセット */
  const clearSearch = useCallback(() => {
    setQuickResults([]);
    setFullResults(null);
  }, []);

  return {
    ready,
    quickResults,
    fullResults,
    quickSearch,
    fullSearch,
    clearSearch,
  };
}

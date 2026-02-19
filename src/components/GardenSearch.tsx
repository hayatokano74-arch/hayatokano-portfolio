"use client";

/**
 * Garden 検索コンポーネント
 * Cosense的な2段階検索UI:
 * - 入力中: QuickSearch（タイトル＋タグ候補表示）
 * - Enter: 全文検索（グリッドをフィルタ）
 */

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { titleToSlug } from "@/lib/garden/slug";

interface SearchHook {
  ready: boolean;
  quickResults: Array<{ id: string; title: string; date: string; type: string; tags: string[]; snippet: string; score: number }>;
  quickSearch: (query: string) => void;
  fullSearch: (query: string) => void;
  clearSearch: () => void;
}

interface GardenSearchProps {
  search: SearchHook;
  onFullSearch: (query: string | null) => void;
  fullSearchIds: string[] | null;
}

export function GardenSearch({ search, onFullSearch, fullSearchIds }: GardenSearchProps) {
  const { ready, quickResults, quickSearch, fullSearch, clearSearch } = search;
  const [query, setQuery] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // 外側クリックでポップアップを閉じる
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);
      setActiveIndex(-1);
      if (value.trim()) {
        quickSearch(value);
        setShowPopup(true);
      } else {
        clearSearch();
        onFullSearch(null);
        setShowPopup(false);
      }
    },
    [quickSearch, clearSearch, onFullSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPopup(false);
        inputRef.current?.blur();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, quickResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < quickResults.length) {
          // 候補を選択 → そのページに遷移
          const selected = quickResults[activeIndex];
          window.location.href = `/garden/${encodeURIComponent(titleToSlug(selected.title))}`;
        } else {
          // 全文検索実行
          fullSearch(query);
          onFullSearch(query);
          setShowPopup(false);
        }
        return;
      }
    },
    [activeIndex, quickResults, fullSearch, onFullSearch, query],
  );

  return (
    <div className="garden-search-wrapper">
      <div className="garden-search">
        <svg
          className="garden-search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="garden-search-input"
          placeholder={ready ? "ページを検索…" : "インデックス読み込み中…"}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && quickResults.length > 0) {
              setShowPopup(true);
            }
          }}
          disabled={!ready}
        />
        {query && (
          <button
            className="garden-search-clear"
            onClick={() => {
              handleInput("");
              inputRef.current?.focus();
            }}
            aria-label="検索をクリア"
          >
            ×
          </button>
        )}
      </div>

      {/* QuickSearch ポップアップ */}
      {showPopup && quickResults.length > 0 && (
        <div ref={popupRef} className="garden-search-popup" role="listbox">
          {quickResults.map((result, i) => (
            <Link
              key={result.id}
              href={`/garden/${encodeURIComponent(titleToSlug(result.title))}`}
              className={`garden-search-item ${i === activeIndex ? "garden-search-item--active" : ""}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => setShowPopup(false)}
            >
              <span className="garden-search-item-title">{result.title}</span>
              <span className="garden-search-item-date">{result.date}</span>
            </Link>
          ))}
          <div className="garden-search-hint">
            Enter で全文検索
          </div>
        </div>
      )}

      {/* QuickSearchで候補なしの場合 */}
      {showPopup && query.trim() && quickResults.length === 0 && (
        <div ref={popupRef} className="garden-search-popup">
          <div className="garden-search-empty">
            候補なし — Enter で全文検索
          </div>
        </div>
      )}

      {/* 全文検索結果バー */}
      {fullSearchIds !== null && (
        <div className="garden-search-result-bar">
          <span>
            「{query}」の検索結果: {fullSearchIds.length} 件
          </span>
          <button
            className="garden-search-result-clear"
            onClick={() => {
              handleInput("");
              inputRef.current?.focus();
            }}
          >
            クリア
          </button>
        </div>
      )}
    </div>
  );
}

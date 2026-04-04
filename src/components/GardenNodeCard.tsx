"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import type { GardenNode } from "@/lib/garden/types";
import { GardenBody } from "./GardenBody";

/**
 * IntersectionObserver で画面に近づいたときだけ本文HTMLをDOMに挿入する。
 * 画面外のエントリは画像リクエストもHTMLパースも発生しない。
 *
 * ページ切替時に scrollTo({ top: 0 }) が走るが、React レンダリングと
 * スクロール完了のタイミングがずれると、上部の要素が「画面外」と誤判定
 * されることがある。requestAnimationFrame で1フレーム遅延させて
 * スクロール完了後に observer を登録する。
 */
function useLazyVisible(rootMargin = "200px") {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;

    // スクロール完了後に observer を登録
    const rafId = requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer?.disconnect();
          }
        },
        { rootMargin },
      );
      observer.observe(el);
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [rootMargin]);

  return { ref, visible };
}

export function GardenNodeCard({ node }: { node: GardenNode }) {
  const { ref, visible } = useLazyVisible();

  return (
    <article className="garden-entry" ref={ref}>
      <time className="garden-entry-date">{node.date}</time>
      <div className="garden-entry-content">
        <Link href={`/garden/${encodeURIComponent(node.slug)}`} className="garden-entry-title-link action-link">
          <h2 className="garden-entry-title">{node.title}</h2>
        </Link>
        {visible && node.contentHtml && (
          <GardenBody html={node.contentHtml} className="garden-entry-body" />
        )}
      </div>
    </article>
  );
}

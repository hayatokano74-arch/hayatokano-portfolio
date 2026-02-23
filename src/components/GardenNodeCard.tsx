"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import type { GardenNode } from "@/lib/garden/types";

/**
 * IntersectionObserver で画面に近づいたときだけ本文HTMLをDOMに挿入する。
 * 画面外のエントリは画像リクエストもHTMLパースも発生しない。
 */
function useLazyVisible(rootMargin = "200px") {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, visible };
}

export function GardenNodeCard({ node, index }: { node: GardenNode; index: number }) {
  const num = String(index).padStart(2, "0");
  const { ref, visible } = useLazyVisible();

  return (
    <article className="garden-entry" ref={ref}>
      <div className="garden-entry-meta">
        <span className="garden-entry-index">{num}</span>
        <time className="garden-entry-date">{node.date}</time>
      </div>
      <Link href={`/garden/${encodeURIComponent(node.slug)}`} className="garden-entry-title-link action-link">
        <h2 className="garden-entry-title">{node.title}</h2>
      </Link>
      {visible && node.contentHtml && (
        <div
          className="garden-entry-body"
          dangerouslySetInnerHTML={{ __html: node.contentHtml }}
        />
      )}
    </article>
  );
}

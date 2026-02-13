"use client";

import Image from "next/image";
import { type NewsItem } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

/* 画像なしプレースホルダー: 正方形 + 対角線× */
function NoImagePlaceholder() {
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <rect x="0.5" y="0.5" width="29" height="29" stroke="var(--muted)" strokeWidth="1" />
      <line x1="0" y1="0" x2="30" y2="30" stroke="var(--muted)" strokeWidth="1" />
      <line x1="30" y1="0" x2="0" y2="30" stroke="var(--muted)" strokeWidth="1" />
    </svg>
  );
}

export function NewsView({ items }: { items: NewsItem[] }) {
  return (
    <div className="news-accordion">
      {items.map((item) => (
        <details key={item.id} className="news-accord-item" name="news">
          {/* サマリー行: 12カラムグリッド */}
          <summary className="news-accord-summary">
            <div className="news-accord-date" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700, color: "var(--muted)" }}>
              {item.date}
            </div>
            <div className="news-accord-title" style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)", fontWeight: 700 }}>
              {item.title}
            </div>
            <div className="news-accord-thumb">
              {item.image ? (
                <Image
                  src={item.image.src}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  style={{ width: 32, height: 32, objectFit: "cover", display: "block" }}
                />
              ) : (
                <NoImagePlaceholder />
              )}
            </div>
          </summary>

          {/* ディテール行: 12カラムグリッド */}
          <div className="news-accord-detail">
            {/* 左スペーサー（Works と同じ） */}
            <div className="news-accord-spacer" />
            {/* 中央: 本文 */}
            <div className="news-accord-body">
              <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-relaxed)", fontWeight: 500 }}>
                {item.body}
              </div>
            </div>
            {/* 右: 画像（Works と同じ配置） */}
            <div className="news-accord-media">
              {item.image ? (
                <Image
                  src={item.image.src}
                  alt=""
                  width={item.image.width}
                  height={item.image.height}
                  loading="lazy"
                  sizes="(max-width: 900px) 100vw, 520px"
                  placeholder="blur"
                  blurDataURL={blurDataURL(item.image.width, item.image.height)}
                  style={{
                    width: "100%",
                    maxWidth: 520,
                    aspectRatio: `${item.image.width} / ${item.image.height}`,
                    objectFit: "cover",
                    marginLeft: "auto",
                    display: "block",
                  }}
                />
              ) : null}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

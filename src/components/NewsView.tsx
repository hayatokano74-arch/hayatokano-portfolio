"use client";

import Image from "next/image";
import { useState } from "react";
import { type NewsItem } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

export function NewsView({ items }: { items: NewsItem[] }) {
  /* 画像付きニュースの最初のものをデフォルトに */
  const firstWithImage = items.find((n) => n.image) ?? null;
  const [activeImage, setActiveImage] = useState(firstWithImage?.image ?? null);

  return (
    <div className="news-layout">
      {/* 左カラム: ニュースリスト */}
      <div className="news-list" style={{ minWidth: 0 }}>
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 ? <div className="hrline" /> : null}
            <article
              className="news-item"
              onMouseEnter={() => {
                if (item.image) setActiveImage(item.image);
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-meta)",
                  lineHeight: "var(--lh-normal)",
                  letterSpacing: "0.08em",
                  color: "var(--muted)",
                  marginBottom: "var(--space-1)",
                }}
              >
                {item.date}
              </div>
              <div
                style={{
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-normal)",
                  fontWeight: 700,
                  marginBottom: "var(--space-2)",
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-relaxed)",
                  fontWeight: 500,
                }}
              >
                {item.body}
              </div>

              {/* モバイル用: インライン画像 */}
              {item.image ? (
                <div className="news-inline-image">
                  <Image
                    src={item.image.src}
                    alt={item.title}
                    width={item.image.width}
                    height={item.image.height}
                    placeholder="blur"
                    blurDataURL={blurDataURL(item.image.width, item.image.height)}
                    loading="lazy"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              ) : null}
            </article>
          </div>
        ))}
      </div>

      {/* 右カラム: ホバー連動画像（デスクトップのみ） */}
      <div className="news-image-column">
        <div className="news-image-sticky">
          {activeImage ? (
            <Image
              key={activeImage.src}
              src={activeImage.src}
              alt=""
              width={activeImage.width}
              height={activeImage.height}
              placeholder="blur"
              blurDataURL={blurDataURL(activeImage.width, activeImage.height)}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                opacity: 1,
                animation: "news-image-fade 300ms ease-out",
              }}
            />
          ) : (
            <div
              style={{
                aspectRatio: "8 / 5",
                background: "var(--line)",
                opacity: 0.15,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

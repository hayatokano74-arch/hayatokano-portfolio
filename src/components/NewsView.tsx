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
              className={`news-item ${item.image ? "has-image" : ""}`}
              onMouseEnter={() => {
                if (item.image) setActiveImage(item.image);
              }}
            >
              {/* モバイル用: 背景画像 */}
              {item.image ? (
                <div className="news-item-bg">
                  <Image
                    src={item.image.src}
                    alt=""
                    fill
                    sizes="100vw"
                    loading="lazy"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />
                </div>
              ) : null}

              <div className="news-item-content">
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
              </div>
            </article>
          </div>
        ))}
      </div>

      {/* 右カラム: ホバー連動画像（デスクトップのみ、固定コンテナ） */}
      <div className="news-image-column">
        <div className="news-image-fixed">
          {activeImage ? (
            <Image
              key={activeImage.src}
              src={activeImage.src}
              alt=""
              fill
              sizes="(max-width: 900px) 0px, 920px"
              placeholder="blur"
              blurDataURL={blurDataURL(activeImage.width, activeImage.height)}
              style={{
                objectFit: "contain",
                objectPosition: "center",
                animation: "news-image-fade 300ms ease-out",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

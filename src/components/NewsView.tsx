"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { type NewsItem } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

export function NewsView({ items }: { items: NewsItem[] }) {
  /* 画像付きニュースをすべて収集 */
  const imagesWithIndex = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => !!item.image);

  const firstImage = imagesWithIndex[0]?.item.image ?? null;
  const [activeSrc, setActiveSrc] = useState(firstImage?.src ?? "");
  const prevSrc = useRef(activeSrc);

  /* 画像切替 */
  const handleHover = (item: NewsItem) => {
    if (item.image && item.image.src !== activeSrc) {
      prevSrc.current = activeSrc;
      setActiveSrc(item.image.src);
    }
  };

  /* 全画像をプリレンダリングしてフェードで切替 */
  const allImages = items.filter((n) => n.image).map((n) => n.image!);

  return (
    <div className="news-container">
      {/* 背景画像レイヤー: 画面中央に固定 */}
      <div className="news-bg-layer">
        {allImages.map((img) => (
          <div
            key={img.src}
            className="news-bg-image"
            style={{
              opacity: img.src === activeSrc ? 1 : 0,
            }}
          >
            <Image
              src={img.src}
              alt=""
              fill
              sizes="100vw"
              placeholder="blur"
              blurDataURL={blurDataURL(img.width, img.height)}
              style={{
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          </div>
        ))}
      </div>

      {/* 前面: ニュースリスト（スクロール可能） */}
      <div className="news-panel">
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 ? <div className="hrline" /> : null}
            <article
              className={`news-item ${item.image ? "has-image" : ""}`}
              onMouseEnter={() => handleHover(item)}
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
    </div>
  );
}

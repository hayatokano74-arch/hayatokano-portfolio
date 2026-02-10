"use client";

import Image from "next/image";
import { useState } from "react";
import { type NewsItem } from "@/lib/mock";
import { blurDataURL } from "@/lib/blur";

export function NewsView({ items }: { items: NewsItem[] }) {
  const firstImage = items.find((n) => n.image)?.image ?? null;
  const [activeSrc, setActiveSrc] = useState(firstImage?.src ?? "");
  const allImages = items.filter((n) => n.image).map((n) => n.image!);

  return (
    <div className="news-layout">
      {/* ── ニュースリスト（左カラム、通常スクロール） ── */}
      <div className="news-list">
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 ? <div className="hrline" /> : null}
            <article
              className={`news-item ${item.image ? "has-image" : ""}`}
              onMouseEnter={() => {
                if (item.image) setActiveSrc(item.image.src);
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

      {/* ── 右カラム: sticky 画像 ── */}
      <div className="news-fixed-image">
        {allImages.map((img) => (
          <Image
            key={img.src}
            src={img.src}
            alt=""
            fill
            sizes="50vw"
            placeholder="blur"
            blurDataURL={blurDataURL(img.width, img.height)}
            style={{
              objectFit: "contain",
              objectPosition: "center",
              opacity: img.src === activeSrc ? 1 : 0,
              transition: "opacity 400ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

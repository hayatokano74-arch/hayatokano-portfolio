/* 目の星 個別ページ: Vercel経由でヒーロー画像を配信（WP直接URLはTwitterボットが取得できないため） */

import { ImageResponse } from "next/og";
import { getMeNoHoshiBySlug } from "@/lib/meNoHoshi";

export const alt = "目の星 — Hayato Kano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const post = await getMeNoHoshiBySlug(slug);
  const imageUrl = post?.media[0]?.src ?? null;
  const title = post?.title ?? "目の星";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#ececec",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
        }}
      >
        {/* ヒーロー画像 */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            alt=""
          />
        )}
        {/* グラデーションオーバーレイ + テキスト */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: imageUrl
              ? "linear-gradient(transparent, rgba(0,0,0,0.65))"
              : "none",
            padding: "40px 56px",
            display: "flex",
            flexDirection: "column",
            color: imageUrl ? "#ffffff" : "#141414",
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </div>
          <div style={{ fontSize: 18, letterSpacing: "0.1em", marginTop: 12, opacity: 0.75 }}>
            目の星 — HAYATO KANO
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

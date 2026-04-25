export const dynamic = 'force-static'
/* 目の星 個別ページ: Vercel経由でヒーロー画像を配信（WP直接URLはTwitterボットが取得できないため） */

import { ImageResponse } from "next/og";
import { getMeNoHoshiBySlug } from "@/lib/meNoHoshi";

export const alt = "目の星 — Hayato Kano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

const BASE_URL = "https://hayatokano.com";

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const post = await getMeNoHoshiBySlug(slug);
  const rawUrl = post?.media[0]?.src ?? null;
  /* 相対URLは絶対URLに変換（OG画像生成では絶対URL必須） */
  const imageUrl = rawUrl?.startsWith("http") ? rawUrl : rawUrl ? `${BASE_URL}${rawUrl}` : null;
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
            width={1200}
            height={630}
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
              : "transparent",
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

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), 'content', 'me-no-hoshi')
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
      .map(f => {
        const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
        const { data } = matter(raw)
        return { slug: data.slug ?? f.replace(/\.(mdx?|md)$/, '') }
      })
  } catch { return [] }
}

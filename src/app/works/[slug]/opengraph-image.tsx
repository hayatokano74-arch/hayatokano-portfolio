/* Works 個別ページ: Vercel経由でヒーロー画像を配信 */

import { ImageResponse } from "next/og";
import { getWorkBySlug } from "@/lib/works";

export const alt = "Works — Hayato Kano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  const lead = work?.media[0];
  const imageUrl = lead?.type === "video" ? (lead.poster ?? null) : (lead?.src ?? null);
  const title = work ? `${work.title} | ${work.year}` : "Works";

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
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            alt=""
          />
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: imageUrl ? "linear-gradient(transparent, rgba(0,0,0,0.65))" : "none",
            padding: "40px 56px",
            display: "flex",
            flexDirection: "column",
            color: imageUrl ? "#ffffff" : "#141414",
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </div>
          <div style={{ fontSize: 18, letterSpacing: "0.1em", marginTop: 12, opacity: 0.75 }}>
            HAYATO KANO
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

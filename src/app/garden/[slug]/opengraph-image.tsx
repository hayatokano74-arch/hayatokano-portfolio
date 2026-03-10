/* Garden記事ごとの動的OG画像 */

import { ImageResponse } from "next/og";
import { getNodeBySlug, getVirtualPageTitle } from "@/lib/garden/reader";

export const alt = "Garden — Hayato Kano";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const node = await getNodeBySlug(decoded);

  const title = node?.title ?? (await getVirtualPageTitle(decoded)) ?? decoded;
  const date = node?.date ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "72px",
          backgroundColor: "#ececec",
          color: "#141414",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            marginBottom: 24,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#9a9a9a",
            }}
          >
            HAYATO KANO
          </div>
          {date && (
            <div
              style={{
                fontSize: 18,
                letterSpacing: "0.04em",
                color: "#9a9a9a",
              }}
            >
              {date}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

/** ページタイトル入りの OGP 画像を生成 */
export function generateOgImage(pageTitle?: string) {
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
        {pageTitle && (
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: 40,
            }}
          >
            {pageTitle}
          </div>
        )}
        <div
          style={{
            fontSize: pageTitle ? 20 : 64,
            fontWeight: 700,
            letterSpacing: pageTitle ? "0.08em" : "-0.02em",
            lineHeight: 1.1,
            color: pageTitle ? "#9a9a9a" : "#141414",
          }}
        >
          HAYATO KANO
        </div>
        {!pageTitle && (
          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              marginTop: 16,
              color: "#9a9a9a",
              letterSpacing: "0.08em",
            }}
          >
            Photographer / Visual Artist
          </div>
        )}
      </div>
    ),
    { ...ogSize }
  );
}

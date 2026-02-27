import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Hayato Kano — Photographer / Visual Artist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          HAYATO KANO
        </div>
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
      </div>
    ),
    { ...size }
  );
}

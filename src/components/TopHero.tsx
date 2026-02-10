"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function TopHero({ candidates }: { candidates: string[] }) {
  const [index, setIndex] = useState(0);
  const src = useMemo(() => candidates[index] ?? null, [candidates, index]);

  return (
    <main style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#d7d7d7" }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Top visual"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
          onError={() => setIndex((i) => i + 1)}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#666",
            fontSize: 14,
            letterSpacing: 0.2,
          }}
        >
          /public/images/top-hero.(jpg|jpeg|png|webp) を配置してください
        </div>
      )}
      <div
        className="page-shell"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <div
          className="site-brand-row"
          style={{
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          }}
        >
          <Link
            href="/"
            className="site-brand action-link"
            style={{ color: "inherit", pointerEvents: "auto" }}
          >
            Hayato Kano
          </Link>
        </div>
      </div>

      <nav
        className="top-hero-menu"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          gap: "clamp(10px, 2.2vh, 22px)",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "clamp(14px, 2vw, 20px)",
          fontWeight: 600,
          lineHeight: 1,
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
          pointerEvents: "auto",
        }}
      >
        <Link href="/works" style={{ color: "inherit", textDecoration: "none" }}>Works</Link>
        <Link href="/text" style={{ color: "inherit", textDecoration: "none" }}>Text</Link>
        <Link href="/me-no-hoshi" style={{ color: "inherit", textDecoration: "none" }}>目の星</Link>
        <Link href="/timeline" style={{ color: "inherit", textDecoration: "none" }}>Time Line</Link>
        <Link href="/news" style={{ color: "inherit", textDecoration: "none" }}>News</Link>
        <Link href="/about" style={{ color: "inherit", textDecoration: "none" }}>About</Link>
        <Link href="/contact" style={{ color: "inherit", textDecoration: "none" }}>Contact</Link>
      </nav>
    </main>
  );
}

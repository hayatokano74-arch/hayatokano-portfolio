"use client";

import Link from "next/link";
import { useState } from "react";

export function TextToc({ toc }: { toc: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className="text-toc"
      style={{
        paddingTop: "var(--space-2)",
      }}
    >
      <button
        type="button"
        className="text-toc-toggle action-link"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          display: "none",
          border: 0,
          background: "transparent",
          padding: 0,
          fontSize: "var(--font-body)",
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        目次
      </button>

      <div className={`text-toc-list ${open ? "is-open" : ""}`}>
      {toc.map((t, i) => (
        <Link
          href={`#${t.id}`}
          key={t.id}
          className="action-link action-link-muted"
          onClick={() => setOpen(false)}
          style={{
            fontSize: "var(--font-body)",
            lineHeight: "var(--lh-relaxed)",
            fontWeight: 400,
            display: "flex",
            gap: 8,
            alignItems: "baseline",
            marginBottom: 0,
          }}
        >
          <span style={{ width: 8, color: "var(--muted)" }}>・</span>
          <span>{t.label}</span>
        </Link>
      ))}
      </div>
    </aside>
  );
}

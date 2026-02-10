"use client";

import Link from "next/link";
import { useState } from "react";

export function TextToc({ toc }: { toc: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className="text-toc"
      style={{
        width: 230,
        paddingTop: "var(--space-2)",
        paddingLeft: "var(--space-1)",
        position: "sticky",
        top: "var(--space-7)",
        alignSelf: "flex-start",
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
            gap: 6,
            alignItems: "baseline",
            marginBottom: i === toc.length - 1 ? 0 : 2,
          }}
        >
          <span style={{ width: 10, color: "var(--muted)" }}>・</span>
          <span>{t.label}</span>
        </Link>
      ))}
      </div>
    </aside>
  );
}

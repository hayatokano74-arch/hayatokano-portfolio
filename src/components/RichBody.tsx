"use client";

import createDOMPurify from "dompurify";

/**
 * CMS の body（HTML）を安全にレンダリングする共通コンポーネント。
 * DOMPurify でサニタイズし、dangerouslySetInnerHTML で表示する。
 */
export function RichBody({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!html) return null;

  const sanitized =
    typeof window !== "undefined"
      ? createDOMPurify(window).sanitize(html)
      : "";

  return (
    <div
      className={`rich-body ${className ?? ""}`.trim()}
      style={style}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

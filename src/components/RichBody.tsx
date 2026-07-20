"use client";

import createDOMPurify from "dompurify";
import { useState, useEffect } from "react";
import { absolutizeBodyImages } from "@/lib/url-utils";

/**
 * CMS の body（HTML）を安全にレンダリングする共通コンポーネント。
 *
 * DOMPurify はブラウザ専用API（window）を使うため、
 * SSRでは空文字を出力し、クライアントでマウント後にサニタイズ済みHTMLを差し込む。
 * これにより suppressHydrationWarning に頼らず水和エラーを回避できる。
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
  const [sanitized, setSanitized] = useState("");

  useEffect(() => {
    if (!html) {
      setSanitized("");
      return;
    }
    /* クライアントでのみ DOMPurify を実行 */
    setSanitized(createDOMPurify(window).sanitize(absolutizeBodyImages(html)));
  }, [html]);

  if (!html) return null;

  return (
    <div
      className={`rich-body ${className ?? ""}`.trim()}
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

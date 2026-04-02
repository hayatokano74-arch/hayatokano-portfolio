'use client'

import { useEffect, useRef } from 'react'
import type React from 'react'
import { A } from './styles'

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  /**
   * 'markdown' = monospace（コード・Markdown 記法向け）
   * 'prose'    = システムフォント（日本語散文・BIO・説明文向け）
   */
  variant?: 'markdown' | 'prose'
  minHeight?: number
}

/**
 * 入力内容に応じて高さが自動拡張するテキストエリア。
 * - variant="markdown" : monospace、コード・MDX 入力向け
 * - variant="prose"    : システムフォント + 広い行間、日本語散文向け
 * border / focus スタイルは admin.css の .admin-input クラスで管理。
 */
export function AutoResizeTextarea({
  value,
  onChange,
  variant = 'markdown',
  minHeight = 96,
  style,
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 高さを auto にリセットしてから scrollHeight を計測（縮小にも対応）
    el.style.height = 'auto'
    el.style.height = Math.max(el.scrollHeight, minHeight) + 'px'
  }, [value, minHeight])

  const variantStyle: React.CSSProperties = variant === 'prose'
    ? {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', 'Noto Sans JP', sans-serif",
        lineHeight: '1.9',
        letterSpacing: '0.03em',
        fontSize: '14px',
      }
    : {
        fontFamily: "'SF Mono', ui-monospace, 'Cascadia Code', 'Fira Mono', monospace",
        lineHeight: '1.65',
        fontSize: '13px',
      }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className="admin-input"
      style={{
        width: '100%',
        padding: A.inputPadding,
        color: A.textPrimary,
        background: A.surfaceBg,
        borderRadius: '6px',
        boxSizing: 'border-box',
        resize: 'none',
        overflow: 'hidden',
        minHeight: minHeight + 'px',
        ...variantStyle,
        ...style,
      }}
      {...props}
    />
  )
}

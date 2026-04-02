import type React from 'react'

/** 管理画面共通デザイントークン */
export const A = {
  // 背景
  pageBg: '#f2f2f0',
  surfaceBg: '#ffffff',
  sidebarBg: '#141414',

  // ボーダー（参照用。実際の border は admin.css の .admin-input で管理）
  border: '#e0e0e0',
  borderFocus: '#141414',

  // テキスト
  textPrimary: '#141414',
  textMuted: '#888888',
  textWhite: '#ffffff',

  // アクション
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',

  // 共通スペーシング
  inputPadding: '10px 14px',
  sectionGap: '32px',
  fieldGap: '16px',
}

/**
 * 入力欄ベーススタイル（border / outline は admin.css の .admin-input で管理）
 * 使用時は必ず className="admin-input" を付与すること。
 */
export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: A.inputPadding,
  fontSize: '14px',
  lineHeight: '1.6',
  color: A.textPrimary,
  background: A.surfaceBg,
  borderRadius: '6px',
  boxSizing: 'border-box',
}

/**
 * テキストエリアスタイル（Markdown / コード向け monospace）
 * 長文入力には AutoResizeTextarea を推奨。
 */
export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "'SF Mono', ui-monospace, 'Cascadia Code', 'Fira Mono', monospace",
  lineHeight: '1.65',
  resize: 'vertical',
}

/** プライマリボタン（hover は admin-btn-primary クラスで管理） */
export const primaryBtn: React.CSSProperties = {
  height: '38px',
  padding: '0 20px',
  fontSize: '14px',
  fontWeight: 600,
  color: A.textWhite,
  background: A.textPrimary,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

/** 危険ボタン（hover は admin-btn-danger クラスで管理） */
export const dangerBtn: React.CSSProperties = {
  height: '38px',
  padding: '0 16px',
  fontSize: '13px',
  fontWeight: 500,
  color: A.danger,
  background: 'transparent',
  border: `1px solid ${A.danger}`,
  borderRadius: '6px',
  cursor: 'pointer',
}

/** ゴーストボタン（hover は admin-btn-ghost クラスで管理） */
export const ghostBtn: React.CSSProperties = {
  height: '38px',
  padding: '0 14px',
  fontSize: '14px',
  color: A.textMuted,
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
}

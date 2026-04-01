import type React from 'react'

/** 管理画面共通デザイントークン */
export const A = {
  // 背景
  pageBg: '#f2f2f0',
  surfaceBg: '#ffffff',
  sidebarBg: '#141414',

  // ボーダー
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
  inputPadding: '10px 12px',
  sectionGap: '32px',
  fieldGap: '14px',
}

/** 入力欄スタイル */
export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: A.inputPadding,
  fontSize: '14px',
  lineHeight: '1.5',
  color: A.textPrimary,
  background: A.surfaceBg,
  border: `1px solid ${A.border}`,
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
}

/** テキストエリアスタイル */
export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'monospace',
  resize: 'vertical',
}

/** プライマリボタン */
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
  transition: 'opacity 0.15s',
}

/** 危険ボタン */
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
  transition: 'opacity 0.15s',
}

/** ゴーストボタン */
export const ghostBtn: React.CSSProperties = {
  height: '38px',
  padding: '0 14px',
  fontSize: '14px',
  color: A.textMuted,
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
}

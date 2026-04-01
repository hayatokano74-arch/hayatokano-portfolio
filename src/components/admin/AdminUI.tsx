'use client'

import { A, primaryBtn, dangerBtn, ghostBtn } from './styles'

// ─────────────────────────────────────────────
// トースト通知
// ─────────────────────────────────────────────
export function AdminToast({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        background: '#141414',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 500,
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        animation: 'admin-toast-in 0.2s ease',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: '16px' }}>✓</span>
      {message}
    </div>
  )
}

// ─────────────────────────────────────────────
// フォーム上部スティッキーバー
// ─────────────────────────────────────────────
type TopBarProps = {
  title: string
  isNew: boolean
  saving: boolean
  onBack: () => void
  onSave: () => void
  onDelete?: () => void
}

export function FormTopBar({ title, isNew, saving, onBack, onSave, onDelete }: TopBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: '56px',
        background: '#ffffff',
        borderBottom: `1px solid ${A.border}`,
        gap: '12px',
      }}
    >
      {/* 左: 戻る + タイトル */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        <button onClick={onBack} style={ghostBtn} aria-label="一覧に戻る">
          ← 一覧
        </button>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: A.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isNew ? '新規作成' : (title || '編集中')}
        </span>
      </div>

      {/* 右: 削除 + 保存 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {!isNew && onDelete && (
          <button onClick={onDelete} disabled={saving} style={dangerBtn}>
            削除
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '保存中...' : '保存　⌘S'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// エラーバナー
// ─────────────────────────────────────────────
export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      role="alert"
      style={{
        margin: '16px 32px 0',
        padding: '12px 16px',
        background: A.dangerBg,
        border: `1px solid ${A.dangerBorder}`,
        borderRadius: '6px',
        fontSize: '14px',
        color: A.danger,
      }}
    >
      {message}
    </div>
  )
}

// ─────────────────────────────────────────────
// セクションヘッダー
// ─────────────────────────────────────────────
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: A.textMuted,
        paddingBottom: '10px',
        borderBottom: `1px solid ${A.border}`,
        marginBottom: '16px',
      }}
    >
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// フィールドラベル + 入力欄セット
// ─────────────────────────────────────────────
export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <label style={{ fontSize: '13px', fontWeight: 500, color: A.textPrimary }}>
          {label}
          {required && (
            <span style={{ color: A.danger, marginLeft: '3px' }}>*</span>
          )}
        </label>
        {hint && (
          <span style={{ fontSize: '12px', color: A.textMuted }}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// カードコンテナ（セクションをカードで包む）
// ─────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${A.border}`,
        borderRadius: '10px',
        padding: '24px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

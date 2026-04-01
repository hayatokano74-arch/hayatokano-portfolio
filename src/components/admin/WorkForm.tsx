'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TagInput } from './TagInput'
import { MediaUpload, MediaItem } from './MediaUpload'

export type WorkFormData = {
  slug: string
  title: string
  date: string
  year: string
  tags: string[]
  pinned: boolean
  exhibition_type: string
  period: string
  venue: string
  address: string
  media: MediaItem[]
  content: string
}

type Props = {
  initialData?: Partial<WorkFormData>
  isNew?: boolean
}

const EMPTY: WorkFormData = {
  slug: '',
  title: '',
  date: '',
  year: '',
  tags: [],
  pinned: false,
  exhibition_type: '',
  period: '',
  venue: '',
  address: '',
  media: [],
  content: '',
}

export function WorkForm({ initialData, isNew = false }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<WorkFormData>({ ...EMPTY, ...initialData })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof WorkFormData>(key: K, val: WorkFormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('タイトルは必須です'); return }
    if (!form.slug.trim()) { setError('スラグは必須です'); return }
    setError('')
    setSaving(true)

    try {
      const url = isNew ? '/api/admin/works' : `/api/admin/works/${form.slug}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '保存に失敗しました')
        return
      }
      router.push('/admin/works')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`「${form.title}」を削除しますか？この操作は取り消せません。`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/works/${form.slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '削除に失敗しました')
        return
      }
      router.push('/admin/works')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* 上部バー */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'var(--bg)', borderColor: '#e0e0e0' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/works')}
            className="text-sm px-3 py-1.5 rounded transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)', background: 'transparent' }}
          >
            ← 一覧
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {isNew ? '新規 Work' : (form.title || '編集中')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: '#e03535', border: '1px solid #e03535', background: 'transparent' }}
            >
              削除
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-5 py-1.5 rounded font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-2 rounded text-sm" style={{ background: '#fef0f0', color: '#e03535', border: '1px solid #fbd5d5' }}>
          {error}
        </div>
      )}

      {/* 2カラムレイアウト */}
      <div className="grid gap-6 p-6" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)' }}>

        {/* 左: メディア（写真家なので優先） */}
        <div className="space-y-6">
          <Section title="画像">
            <MediaUpload
              section="works"
              slug={form.slug}
              value={form.media}
              onChange={v => set('media', v)}
            />
          </Section>

          <Section title="本文（Markdown）">
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="作品の説明を入力..."
              rows={12}
              className="w-full px-3 py-2.5 rounded text-sm font-mono outline-none resize-y"
              style={{
                background: 'var(--bg)',
                border: '1px solid #d0d0d0',
                color: 'var(--fg)',
                lineHeight: 1.6,
              }}
            />
          </Section>
        </div>

        {/* 右: フィールド群 */}
        <div className="space-y-6">
          <Section title="基本情報">
            <div className="space-y-3">
              <Field label="タイトル *">
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="作品タイトル"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>

              <Field label="スラグ *" hint="URLに使用 (半角英数字・ハイフン)">
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="work-title-2024"
                  disabled={!isNew}
                  className={inputCls}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.6 }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="日付">
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
                <Field label="年">
                  <input
                    type="text"
                    value={form.year}
                    onChange={e => set('year', e.target.value)}
                    placeholder="2024"
                    className={inputCls}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="タグ">
                <TagInput
                  value={form.tags}
                  onChange={v => set('tags', v)}
                  placeholder="タグを入力してEnter"
                />
              </Field>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => set('pinned', e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                  style={{ accentColor: 'var(--fg)' }}
                />
                <span className="text-sm" style={{ color: 'var(--fg)' }}>トップにピン留め</span>
              </label>
            </div>
          </Section>

          <Section title="展示詳細">
            <div className="space-y-3">
              <Field label="展示種別">
                <input
                  type="text"
                  value={form.exhibition_type}
                  onChange={e => set('exhibition_type', e.target.value)}
                  placeholder="個展 / グループ展 / 野外展示..."
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>

              <Field label="期間">
                <input
                  type="text"
                  value={form.period}
                  onChange={e => set('period', e.target.value)}
                  placeholder="2024.3.1 — 3.31"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>

              <Field label="会場">
                <input
                  type="text"
                  value={form.venue}
                  onChange={e => set('venue', e.target.value)}
                  placeholder="ギャラリー名"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>

              <Field label="住所">
                <input
                  type="text"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="東京都..."
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// --- 小コンポーネント ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-[11px] font-semibold uppercase tracking-widest mb-3 pb-2 border-b"
        style={{ color: 'var(--muted)', borderColor: '#e0e0e0', letterSpacing: '0.12em' }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--fg)' }}>{label}</label>
        {hint && <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-2.5 py-2 rounded text-sm outline-none transition-colors'
const inputStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid #d0d0d0',
  color: 'var(--fg)',
}

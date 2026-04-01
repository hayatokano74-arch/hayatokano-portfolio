'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FormData = { slug: string; title: string; date: string; content: string }

type Props = { initialData?: Partial<FormData>; isNew?: boolean }

export function NewsForm({ initialData, isNew = false }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    slug: '', title: '', date: '', content: '', ...initialData,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('タイトルは必須です'); return }
    if (!form.slug.trim()) { setError('スラグは必須です'); return }
    setError('')
    setSaving(true)
    try {
      const url = isNew ? '/api/admin/news' : `/api/admin/news/${form.slug}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '保存に失敗しました'); return }
      router.push('/admin/news')
      router.refresh()
    } catch { setError('通信エラーが発生しました') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm(`「${form.title}」を削除しますか？`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/news/${form.slug}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '削除に失敗しました'); return }
      router.push('/admin/news')
      router.refresh()
    } catch { setError('通信エラーが発生しました') }
    finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid #d0d0d0', color: 'var(--fg)',
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* 上部バー */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'var(--bg)', borderColor: '#e0e0e0' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/admin/news')}
            className="text-sm px-3 py-1.5 rounded hover:opacity-60 transition-opacity"
            style={{ color: 'var(--muted)' }}>← 一覧</button>
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {isNew ? '新規 News' : (form.title || '編集中')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button type="button" onClick={handleDelete} disabled={saving}
              className="text-xs px-3 py-1.5 rounded hover:opacity-70 disabled:opacity-40 transition-opacity"
              style={{ color: '#e03535', border: '1px solid #e03535' }}>削除</button>
          )}
          <button type="button" onClick={handleSave} disabled={saving}
            className="text-sm px-5 py-1.5 rounded font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-2 rounded text-sm"
          style={{ background: '#fef0f0', color: '#e03535', border: '1px solid #fbd5d5' }}>{error}</div>
      )}

      <div className="max-w-2xl mx-auto p-6 space-y-5">
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--fg)' }}>タイトル *</label>
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="ニュースタイトル"
            className="w-full px-3 py-2.5 rounded text-sm outline-none"
            style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--fg)' }}>スラグ *</label>
            <input type="text" value={form.slug}
              onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="news-2024-01" disabled={!isNew}
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={{ ...inputStyle, opacity: isNew ? 1 : 0.6 }} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--fg)' }}>日付</label>
            <input type="date" value={form.date ? form.date.replace(/\//g, '-') : ''}
              onChange={e => set('date', e.target.value.replace(/-/g, '/'))}
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={inputStyle} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--fg)' }}>本文（Markdown）</label>
          <textarea value={form.content} onChange={e => set('content', e.target.value)}
            placeholder="ニュース本文を入力..." rows={16}
            className="w-full px-3 py-2.5 rounded text-sm font-mono outline-none resize-y"
            style={{ ...inputStyle, lineHeight: 1.6 }} />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TagInput } from './TagInput'
import { MediaUpload, MediaItem } from './MediaUpload'

// --- 型定義 ---

type DetailItem = { key: string; label: string; value: string }

type KeyVisual = {
  id: string
  caption: string
  image: { src: string; alt: string; width: number; height: number }
}

type PastWork = {
  id: string
  title: string
  year: string
  image: { src: string; alt: string; width: number; height: number }
}

export type MeNoHoshiFormData = {
  slug: string
  title: string
  subtitle: string
  date: string
  year: string
  tags: string[]
  showKeyVisuals: boolean
  showPastWorks: boolean
  showArchiveWorks: boolean
  details: DetailItem[]
  media: MediaItem[]       // サムネイル
  keyVisuals: KeyVisual[]
  pastWorks: PastWork[]
  bio: string
  content: string
}

type Props = {
  initialData?: Partial<MeNoHoshiFormData>
  isNew?: boolean
}

const EMPTY: MeNoHoshiFormData = {
  slug: '',
  title: '',
  subtitle: '',
  date: '',
  year: '',
  tags: [],
  showKeyVisuals: true,
  showPastWorks: true,
  showArchiveWorks: true,
  details: [],
  media: [],
  keyVisuals: [],
  pastWorks: [],
  bio: '',
  content: '',
}

// ---

export function MeNoHoshiForm({ initialData, isNew = false }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<MeNoHoshiFormData>({ ...EMPTY, ...initialData })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof MeNoHoshiFormData>(key: K, val: MeNoHoshiFormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('タイトルは必須です'); return }
    if (!form.slug.trim()) { setError('スラグは必須です'); return }
    setError('')
    setSaving(true)

    try {
      const url = isNew ? '/api/admin/me-no-hoshi' : `/api/admin/me-no-hoshi/${form.slug}`
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
      router.push('/admin/me-no-hoshi')
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
      const res = await fetch(`/api/admin/me-no-hoshi/${form.slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '削除に失敗しました')
        return
      }
      router.push('/admin/me-no-hoshi')
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
            onClick={() => router.push('/admin/me-no-hoshi')}
            className="text-sm px-3 py-1.5 rounded transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)', background: 'transparent' }}
          >
            ← 一覧
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {isNew ? '新規 目の星' : (form.title || '編集中')}
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

        {/* 左: ビジュアル系 */}
        <div className="space-y-6">

          {/* KEY VISUAL */}
          <Section title="KEY VISUAL 画像">
            <KeyVisualsEditor
              value={form.keyVisuals}
              slug={form.slug}
              onChange={v => set('keyVisuals', v)}
            />
          </Section>

          {/* サムネイル */}
          <Section title="サムネイル（一覧表示用）">
            <MediaUpload
              section="me-no-hoshi"
              slug={form.slug}
              value={form.media}
              onChange={v => set('media', v)}
            />
          </Section>

          {/* PAST WORKS */}
          <Section title="PAST WORKS">
            <PastWorksEditor
              value={form.pastWorks}
              slug={form.slug}
              onChange={v => set('pastWorks', v)}
            />
          </Section>

          {/* BIO */}
          <Section title="BIO">
            <textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="アーティストの紹介文..."
              rows={5}
              className="w-full px-3 py-2.5 rounded text-sm outline-none resize-y"
              style={{ background: 'var(--bg)', border: '1px solid #d0d0d0', color: 'var(--fg)', lineHeight: 1.6 }}
            />
          </Section>

          {/* 本文 */}
          <Section title="本文（Markdown）">
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="展示の説明を入力..."
              rows={10}
              className="w-full px-3 py-2.5 rounded text-sm font-mono outline-none resize-y"
              style={{ background: 'var(--bg)', border: '1px solid #d0d0d0', color: 'var(--fg)', lineHeight: 1.6 }}
            />
          </Section>
        </div>

        {/* 右: メタ情報 */}
        <div className="space-y-6">

          <Section title="基本情報">
            <div className="space-y-3">
              <Field label="タイトル *">
                <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="展示タイトル" className={inputCls} style={inputStyle} />
              </Field>

              <Field label="スラグ *" hint="URLに使用">
                <input type="text" value={form.slug}
                  onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="m001" disabled={!isNew}
                  className={inputCls} style={{ ...inputStyle, opacity: isNew ? 1 : 0.6 }} />
              </Field>

              <Field label="サブタイトル">
                <input type="text" value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
                  placeholder="サブタイトル（任意）" className={inputCls} style={inputStyle} />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="日付">
                  <input type="date" value={form.date ? form.date.replace(/\//g, '-') : ''}
                    onChange={e => set('date', e.target.value.replace(/-/g, '/'))}
                    className={inputCls} style={inputStyle} />
                </Field>
                <Field label="年">
                  <input type="text" value={form.year} onChange={e => set('year', e.target.value)}
                    placeholder="2024" className={inputCls} style={inputStyle} />
                </Field>
              </div>

              <Field label="タグ">
                <TagInput value={form.tags} onChange={v => set('tags', v)} placeholder="タグを入力してEnter" />
              </Field>
            </div>
          </Section>

          {/* 表示切替 */}
          <Section title="表示設定">
            <div className="space-y-2">
              {(
                [
                  { key: 'showKeyVisuals', label: 'Key Visuals を表示' },
                  { key: 'showPastWorks', label: 'Past Works を表示' },
                  { key: 'showArchiveWorks', label: 'Archive Works を表示' },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={e => set(key, e.target.checked)}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: 'var(--fg)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--fg)' }}>{label}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* 詳細情報（動的 key-value） */}
          <Section title="詳細情報">
            <DetailsEditor value={form.details} onChange={v => set('details', v)} />
          </Section>
        </div>
      </div>
    </div>
  )
}

// --- Key Visuals エディタ ---

function KeyVisualsEditor({
  value, slug, onChange,
}: { value: KeyVisual[]; slug: string; onChange: (v: KeyVisual[]) => void }) {
  const dragIdx = { current: null as number | null }

  async function handleUpload(files: File[]) {
    if (!slug) { alert('先にスラグを入力してください'); return }
    const newItems: KeyVisual[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('section', 'me-no-hoshi')
      fd.append('slug', slug)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        newItems.push({
          id: `kv-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          caption: '',
          image: { src: data.src, alt: '', width: data.width, height: data.height },
        })
      }
    }
    onChange([...value, ...newItems])
  }

  function updateCaption(id: string, caption: string) {
    onChange(value.map(kv => kv.id === id ? { ...kv, caption } : kv))
  }

  function updateAlt(id: string, alt: string) {
    onChange(value.map(kv => kv.id === id ? { ...kv, image: { ...kv.image, alt } } : kv))
  }

  function remove(id: string) {
    onChange(value.filter(kv => kv.id !== id))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((kv, index) => (
            <div
              key={kv.id}
              draggable
              onDragStart={() => { dragIdx.current = index }}
              onDragEnter={() => {
                if (dragIdx.current === null || dragIdx.current === index) return
                const next = [...value]
                const [moved] = next.splice(dragIdx.current, 1)
                next.splice(index, 0, moved)
                dragIdx.current = index
                onChange(next)
              }}
              onDragOver={e => e.preventDefault()}
              className="rounded-lg overflow-hidden group"
              style={{ border: '1px solid #e0e0e0', cursor: 'grab' }}
            >
              <div className="relative aspect-video bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={kv.image.src} alt={kv.image.alt} className="w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>{index + 1}</span>
                <button type="button" onClick={() => remove(kv.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label="削除">×</button>
              </div>
              <div className="p-2 space-y-1.5" style={{ background: '#fafafa' }}>
                <input type="text" value={kv.caption} onChange={e => updateCaption(kv.id, e.target.value)}
                  placeholder="キャプション（任意）"
                  className="w-full px-2 py-1 text-xs rounded outline-none"
                  style={{ background: '#fff', border: '1px solid #e0e0e0', color: 'var(--fg)' }} />
                <input type="text" value={kv.image.alt} onChange={e => updateAlt(kv.id, e.target.value)}
                  placeholder="alt テキスト（任意）"
                  className="w-full px-2 py-1 text-xs rounded outline-none"
                  style={{ background: '#fff', border: '1px solid #e0e0e0', color: 'var(--fg)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <label
        className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors"
        style={{ borderColor: '#d0d0d0' }}
      >
        <span className="text-xs" style={{ color: 'var(--muted)' }}>クリックまたはドロップで追加</span>
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) handleUpload(files)
            e.target.value = ''
          }} />
      </label>
    </div>
  )
}

// --- Past Works エディタ ---

function PastWorksEditor({
  value, slug, onChange,
}: { value: PastWork[]; slug: string; onChange: (v: PastWork[]) => void }) {
  async function handleUpload(files: File[]) {
    if (!slug) { alert('先にスラグを入力してください'); return }
    const newItems: PastWork[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('section', 'me-no-hoshi')
      fd.append('slug', slug)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        newItems.push({
          id: `past-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: '',
          year: '',
          image: { src: data.src, alt: '', width: data.width, height: data.height },
        })
      }
    }
    onChange([...value, ...newItems])
  }

  function update(id: string, field: 'title' | 'year', val: string) {
    onChange(value.map(pw => pw.id === id ? { ...pw, [field]: val } : pw))
  }

  function remove(id: string) {
    onChange(value.filter(pw => pw.id !== id))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {value.map((pw, index) => (
            <div key={pw.id} className="rounded overflow-hidden group" style={{ border: '1px solid #e0e0e0' }}>
              <div className="relative aspect-square bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pw.image.src} alt={pw.title} className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 text-[10px] px-1 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>{index + 1}</span>
                <button type="button" onClick={() => remove(pw.id)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label="削除">×</button>
              </div>
              <div className="p-1.5 space-y-1" style={{ background: '#fafafa' }}>
                <input type="text" value={pw.title} onChange={e => update(pw.id, 'title', e.target.value)}
                  placeholder="作品タイトル"
                  className="w-full px-1.5 py-1 text-[11px] rounded outline-none"
                  style={{ background: '#fff', border: '1px solid #e0e0e0', color: 'var(--fg)' }} />
                <input type="text" value={pw.year} onChange={e => update(pw.id, 'year', e.target.value)}
                  placeholder="年 (例: 2023)"
                  className="w-full px-1.5 py-1 text-[11px] rounded outline-none"
                  style={{ background: '#fff', border: '1px solid #e0e0e0', color: 'var(--fg)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <label
        className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 py-5 cursor-pointer"
        style={{ borderColor: '#d0d0d0' }}
      >
        <span className="text-xs" style={{ color: 'var(--muted)' }}>クリックまたはドロップで追加</span>
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) handleUpload(files)
            e.target.value = ''
          }} />
      </label>
    </div>
  )
}

// --- Details エディタ（動的 key-value） ---

function DetailsEditor({
  value, onChange,
}: { value: DetailItem[]; onChange: (v: DetailItem[]) => void }) {
  function add() {
    onChange([...value, { key: '', label: '', value: '' }])
  }

  function update(index: number, field: keyof DetailItem, val: string) {
    const next = [...value]
    next[index] = { ...next[index], [field]: val }
    onChange(next)
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="grid gap-1.5" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <input type="text" value={item.label} onChange={e => update(i, 'label', e.target.value)}
            placeholder="ラベル (PERIOD)"
            className={inputCls} style={inputStyle} />
          <input type="text" value={item.value} onChange={e => update(i, 'value', e.target.value)}
            placeholder="値 (2024.3 – 4)"
            className={inputCls} style={inputStyle} />
          <button type="button" onClick={() => remove(i)}
            className="px-2 text-xs rounded transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)', border: '1px solid #e0e0e0' }}
            aria-label="削除">×</button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full py-2 rounded text-xs transition-colors"
        style={{ border: '1px dashed #d0d0d0', color: 'var(--muted)' }}
      >
        + 項目を追加
      </button>
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

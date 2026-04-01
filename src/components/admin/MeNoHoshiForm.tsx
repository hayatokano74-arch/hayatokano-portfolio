'use client'

import { TagInput } from './TagInput'
import { MediaUpload, MediaItem } from './MediaUpload'
import { useAdminForm } from './useAdminForm'
import { FormTopBar, ErrorBanner, AdminToast, SectionTitle, Field, Card } from './AdminUI'
import { inputStyle, textareaStyle, A } from './styles'

// --- 型 ---
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
  media: MediaItem[]
  keyVisuals: KeyVisual[]
  pastWorks: PastWork[]
  bio: string
  content: string
}

const EMPTY: MeNoHoshiFormData = {
  slug: '', title: '', subtitle: '', date: '', year: '', tags: [],
  showKeyVisuals: true, showPastWorks: true, showArchiveWorks: true,
  details: [], media: [], keyVisuals: [], pastWorks: [], bio: '', content: '',
}

type Props = { initialData?: Partial<MeNoHoshiFormData>; isNew?: boolean }

export function MeNoHoshiForm({ initialData, isNew = false }: Props) {
  const { form, setField, saving, error, toast, handleSave, handleDelete, goBack } =
    useAdminForm<MeNoHoshiFormData>(
      { ...EMPTY, ...initialData },
      {
        isNew: isNew ?? false,
        listPath: '/admin/me-no-hoshi',
        saveUrl: (slug) => isNew ? '/api/admin/me-no-hoshi' : `/api/admin/me-no-hoshi/${slug}`,
        deleteUrl: (slug) => `/api/admin/me-no-hoshi/${slug}`,
      },
    )

  return (
    <div style={{ minHeight: '100vh', background: A.pageBg }}>
      <FormTopBar
        title={form.title}
        isNew={isNew ?? false}
        saving={saving}
        onBack={goBack}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <ErrorBanner message={error} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '24px',
          padding: '28px 32px',
          alignItems: 'start',
        }}
      >
        {/* 左: ビジュアル系 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <SectionTitle>Key Visual 画像</SectionTitle>
            <KeyVisualsEditor value={form.keyVisuals} slug={form.slug} onChange={v => setField('keyVisuals', v)} />
          </Card>

          <Card>
            <SectionTitle>サムネイル（一覧表示用）</SectionTitle>
            <MediaUpload section="me-no-hoshi" slug={form.slug} value={form.media} onChange={v => setField('media', v)} />
          </Card>

          <Card>
            <SectionTitle>Past Works</SectionTitle>
            <PastWorksEditor value={form.pastWorks} slug={form.slug} onChange={v => setField('pastWorks', v)} />
          </Card>

          <Card>
            <SectionTitle>Bio（アーティスト紹介）</SectionTitle>
            <textarea
              value={form.bio}
              onChange={e => setField('bio', e.target.value)}
              placeholder="アーティストの紹介文..."
              rows={5}
              style={textareaStyle}
            />
          </Card>

          <Card>
            <SectionTitle>本文（Markdown）</SectionTitle>
            <textarea
              value={form.content}
              onChange={e => setField('content', e.target.value)}
              placeholder="展示の説明を入力..."
              rows={10}
              style={textareaStyle}
            />
          </Card>
        </div>

        {/* 右: メタ情報 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <SectionTitle>基本情報</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="タイトル" required>
                <input type="text" value={form.title} onChange={e => setField('title', e.target.value)}
                  placeholder="展示タイトル" style={inputStyle} />
              </Field>
              <Field label="スラグ" hint="URLに使用" required>
                <input type="text" value={form.slug}
                  onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="m001" disabled={!isNew}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.5, cursor: isNew ? 'text' : 'not-allowed' }} />
              </Field>
              <Field label="サブタイトル">
                <input type="text" value={form.subtitle} onChange={e => setField('subtitle', e.target.value)}
                  placeholder="サブタイトル（任意）" style={inputStyle} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="日付">
                  <input type="date" value={form.date ? form.date.replace(/\//g, '-') : ''}
                    onChange={e => setField('date', e.target.value.replace(/-/g, '/'))}
                    style={inputStyle} />
                </Field>
                <Field label="年">
                  <input type="text" value={form.year} onChange={e => setField('year', e.target.value)}
                    placeholder="2024" style={inputStyle} />
                </Field>
              </div>
              <Field label="タグ">
                <TagInput value={form.tags} onChange={v => setField('tags', v)} placeholder="入力してEnterで追加" />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionTitle>表示設定</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(
                [
                  { key: 'showKeyVisuals', label: 'Key Visual を表示' },
                  { key: 'showPastWorks', label: 'Past Works を表示' },
                  { key: 'showArchiveWorks', label: 'Archive Works を表示' },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: A.textPrimary, userSelect: 'none' }}>
                  <input type="checkbox" checked={form[key]} onChange={e => setField(key, e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: A.textPrimary, cursor: 'pointer' }} />
                  {label}
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>詳細情報</SectionTitle>
            <DetailsEditor value={form.details} onChange={v => setField('details', v)} />
          </Card>
        </div>
      </div>

      <AdminToast message={toast} />
    </div>
  )
}

// ─── Key Visuals エディタ ───

function KeyVisualsEditor({ value, slug, onChange }: { value: KeyVisual[]; slug: string; onChange: (v: KeyVisual[]) => void }) {
  const dragIdx = { current: null as number | null }

  async function handleUpload(files: File[]) {
    if (!slug) { alert('先にスラグを入力してください'); return }
    const newItems: KeyVisual[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file); fd.append('section', 'me-no-hoshi'); fd.append('slug', slug)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        newItems.push({ id: `kv-${Date.now()}-${Math.random().toString(36).slice(2)}`, caption: '', image: { src: data.src, alt: '', width: data.width, height: data.height } })
      }
    }
    onChange([...value, ...newItems])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {value.map((kv, index) => (
        <div key={kv.id} draggable
          onDragStart={() => { dragIdx.current = index }}
          onDragEnter={() => {
            if (dragIdx.current === null || dragIdx.current === index) return
            const next = [...value]; const [m] = next.splice(dragIdx.current, 1); next.splice(index, 0, m)
            dragIdx.current = index; onChange(next)
          }}
          onDragOver={e => e.preventDefault()}
          style={{ background: '#ffffff', border: `1px solid ${A.border}`, borderRadius: '8px', overflow: 'hidden', cursor: 'grab' }}
        >
          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#f0f0f0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={kv.image.src} alt={kv.image.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontFamily: 'monospace' }}>{index + 1}</span>
            <button type="button" onClick={() => onChange(value.filter(x => x.id !== kv.id))}
              style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#fafafa' }}>
            <input type="text" value={kv.caption} onChange={e => onChange(value.map(x => x.id === kv.id ? { ...x, caption: e.target.value } : x))}
              placeholder="キャプション（任意）" style={{ ...inputStyle, fontSize: '13px', padding: '7px 10px' }} />
            <input type="text" value={kv.image.alt} onChange={e => onChange(value.map(x => x.id === kv.id ? { ...x, image: { ...x.image, alt: e.target.value } } : x))}
              placeholder="alt テキスト（アクセシビリティ用）" style={{ ...inputStyle, fontSize: '13px', padding: '7px 10px' }} />
          </div>
        </div>
      ))}
      <UploadZone onUpload={handleUpload} />
    </div>
  )
}

// ─── Past Works エディタ ───

function PastWorksEditor({ value, slug, onChange }: { value: PastWork[]; slug: string; onChange: (v: PastWork[]) => void }) {
  async function handleUpload(files: File[]) {
    if (!slug) { alert('先にスラグを入力してください'); return }
    const newItems: PastWork[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file); fd.append('section', 'me-no-hoshi'); fd.append('slug', slug)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        newItems.push({ id: `past-${Date.now()}-${Math.random().toString(36).slice(2)}`, title: '', year: '', image: { src: data.src, alt: '', width: data.width, height: data.height } })
      }
    }
    onChange([...value, ...newItems])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {value.map((pw, index) => (
          <div key={pw.id} style={{ background: '#ffffff', border: `1px solid ${A.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '1', background: '#f0f0f0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pw.image.src} alt={pw.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', top: '6px', left: '6px', fontSize: '11px', padding: '2px 5px', borderRadius: '4px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontFamily: 'monospace' }}>{index + 1}</span>
              <button type="button" onClick={() => onChange(value.filter(x => x.id !== pw.id))}
                style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', background: '#fafafa' }}>
              <input type="text" value={pw.title} onChange={e => onChange(value.map(x => x.id === pw.id ? { ...x, title: e.target.value } : x))}
                placeholder="作品タイトル" style={{ ...inputStyle, fontSize: '13px', padding: '6px 8px' }} />
              <input type="text" value={pw.year} onChange={e => onChange(value.map(x => x.id === pw.id ? { ...x, year: e.target.value } : x))}
                placeholder="年 (例: 2023)" style={{ ...inputStyle, fontSize: '13px', padding: '6px 8px' }} />
            </div>
          </div>
        ))}
      </div>
      <UploadZone onUpload={handleUpload} />
    </div>
  )
}

// ─── Details エディタ ───

function DetailsEditor({ value, onChange }: { value: DetailItem[]; onChange: (v: DetailItem[]) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {value.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
          <input type="text" value={item.label} onChange={e => { const n = [...value]; n[i] = { ...n[i], label: e.target.value }; onChange(n) }}
            placeholder="ラベル (PERIOD)" style={{ ...inputStyle, fontSize: '13px' }} />
          <input type="text" value={item.value} onChange={e => { const n = [...value]; n[i] = { ...n[i], value: e.target.value }; onChange(n) }}
            placeholder="値" style={{ ...inputStyle, fontSize: '13px' }} />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
            style={{ width: '32px', height: '38px', border: `1px solid ${A.border}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', color: A.textMuted, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { key: '', label: '', value: '' }])}
        style={{ width: '100%', padding: '10px', border: `1px dashed ${A.border}`, borderRadius: '6px', background: 'transparent', color: A.textMuted, fontSize: '13px', cursor: 'pointer' }}>
        + 項目を追加
      </button>
    </div>
  )
}

// ─── 共通アップロードゾーン ───

function UploadZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '20px', border: `1.5px dashed ${A.border}`, borderRadius: '8px', cursor: 'pointer', background: '#fafafa' }}>
      <span style={{ fontSize: '13px', color: A.textMuted }}>クリックまたはドロップで追加</span>
      <input type="file" accept="image/*" multiple className="hidden"
        onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onUpload(f); e.target.value = '' }} />
    </label>
  )
}

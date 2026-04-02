'use client'

import { TagInput } from './TagInput'
import { MediaUpload, MediaItem } from './MediaUpload'
import { useAdminForm } from './useAdminForm'
import { AutoResizeTextarea } from './AutoResizeTextarea'
import { FormTopBar, ErrorBanner, AdminToast, SectionTitle, Field, Card, DisplayHint } from './AdminUI'
import { inputStyle, A } from './styles'

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

type ArchiveWork = {
  id: string
  title: string
  year: string
  image: { src: string; alt: string; width: number; height: number }
}

export type PastExhibition = { year: string; info: string }
export type SnsLink = { label: string; url: string }

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
  archiveWorks: ArchiveWork[]
  bio: string
  pastExhibitions: PastExhibition[]
  snsLinks: SnsLink[]
  notice: string
  heroCaption: string
  archiveNote: string
  content: string
}

const EMPTY: MeNoHoshiFormData = {
  slug: '', title: '', subtitle: '', date: '', year: '', tags: [],
  showKeyVisuals: true, showPastWorks: true, showArchiveWorks: true,
  details: [], media: [], keyVisuals: [], pastWorks: [], archiveWorks: [],
  bio: '', pastExhibitions: [], snsLinks: [],
  notice: '', heroCaption: '', archiveNote: '', content: '',
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

      {/*
        2カラム構成 — 実際のページ表示に対応:
        左カラム → ページ右側（ビジュアル: KEY VISUAL / PAST WORKS / ARCHIVE）
        右カラム → ページ左側（テキスト: TEXT / DETAILS / PROFILE / EXHIBITION / NOTICE）
      */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '24px',
          padding: '28px 32px',
          alignItems: 'start',
        }}
      >
        {/* ── 左カラム: ビジュアル系（ページ右側に対応） ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* サムネイル */}
          <Card>
            <SectionTitle>サムネイル</SectionTitle>
            <DisplayHint>一覧ページのカード画像として表示（個別ページには表示されない）</DisplayHint>
            <MediaUpload section="me-no-hoshi" slug={form.slug} value={form.media} onChange={v => setField('media', v)} />
          </Card>

          {/* KEY VISUAL */}
          <Card>
            <SectionTitle>KEY VISUAL</SectionTitle>
            <DisplayHint>ページ右上・メインビジュアルとして大きく表示</DisplayHint>
            <KeyVisualsEditor value={form.keyVisuals} slug={form.slug} onChange={v => setField('keyVisuals', v)} />
            <div style={{ marginTop: '16px' }}>
              <Field label="KEY VISUALキャプション" hint="KEY VISUALセクション下部に薄い色で表示">
                <input
                  type="text" value={form.heroCaption}
                  onChange={e => setField('heroCaption', e.target.value)}
                  placeholder="メイン画像全体へのキャプション（任意）"
                  style={inputStyle} className="admin-input"
                />
              </Field>
            </div>
          </Card>

          {/* PAST WORKS */}
          <Card>
            <SectionTitle>PAST WORKS</SectionTitle>
            <DisplayHint>ページ右下・PAST WORKSセクションに表示（showPastWorks=ONのとき）</DisplayHint>
            <PastWorksEditor value={form.pastWorks} slug={form.slug} onChange={v => setField('pastWorks', v)} />
          </Card>

          {/* ARCHIVE */}
          <Card>
            <SectionTitle>ARCHIVE</SectionTitle>
            <DisplayHint>ページ右下・ARCHIVEセクションに表示（showArchiveWorks=ONのとき）</DisplayHint>
            <ArchiveWorksEditor value={form.archiveWorks} slug={form.slug} onChange={v => setField('archiveWorks', v)} />
            <div style={{ marginTop: '16px' }}>
              <Field label="ARCHIVEセクション注釈" hint="将来の表示用・現在未使用">
                <input
                  type="text" value={form.archiveNote}
                  onChange={e => setField('archiveNote', e.target.value)}
                  placeholder="アーカイブの補足（任意）"
                  style={inputStyle} className="admin-input"
                />
              </Field>
            </div>
          </Card>

        </div>

        {/* ── 右カラム: テキスト・メタ（ページ左側に対応） ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 基本情報 */}
          <Card>
            <SectionTitle>基本情報</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="タイトル" required>
                <input
                  type="text" value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="展示タイトル"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="スラグ" hint="URLに使用" required>
                <input
                  type="text" value={form.slug}
                  onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="m001"
                  disabled={!isNew}
                  spellCheck={false}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.5, cursor: isNew ? 'text' : 'not-allowed' }}
                  className="admin-input"
                />
              </Field>
              <Field label="サブタイトル">
                <input
                  type="text" value={form.subtitle}
                  onChange={e => setField('subtitle', e.target.value)}
                  placeholder="サブタイトル（任意）"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="日付">
                  <input
                    type="date"
                    value={form.date ? form.date.replace(/\//g, '-') : ''}
                    onChange={e => setField('date', e.target.value.replace(/-/g, '/'))}
                    style={inputStyle} className="admin-input"
                  />
                </Field>
                <Field label="年">
                  <input
                    type="text" value={form.year}
                    onChange={e => setField('year', e.target.value)}
                    placeholder="2024"
                    style={inputStyle} className="admin-input"
                  />
                </Field>
              </div>
              <Field label="タグ">
                <TagInput value={form.tags} onChange={v => setField('tags', v)} placeholder="入力してEnterで追加" />
              </Field>
            </div>
          </Card>

          {/* 表示設定 */}
          <Card>
            <SectionTitle>表示設定</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(
                [
                  { key: 'showKeyVisuals', label: 'KEY VISUAL を表示' },
                  { key: 'showPastWorks', label: 'PAST WORKS を表示' },
                  { key: 'showArchiveWorks', label: 'ARCHIVE を表示' },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: A.textPrimary, userSelect: 'none' }}>
                  <input
                    type="checkbox" checked={form[key]}
                    onChange={e => setField(key, e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: A.textPrimary, cursor: 'pointer' }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Card>

          {/* TEXT — ステートメント */}
          <Card>
            <SectionTitle>TEXT — ステートメント</SectionTitle>
            <DisplayHint>ページ左カラム最上部・TEXTセクションに表示</DisplayHint>
            <AutoResizeTextarea
              value={form.content}
              onChange={e => setField('content', e.target.value)}
              variant="prose"
              minHeight={200}
              placeholder="展示の説明・ステートメントを入力..."
            />
          </Card>

          {/* DETAILS — 展示情報テーブル */}
          <Card>
            <SectionTitle>DETAILS — 展示情報</SectionTitle>
            <DisplayHint>ページ左カラム・TEXT下のDETAILSテーブルに表示（PERIOD / VENUE 等）</DisplayHint>
            <DetailsEditor value={form.details} onChange={v => setField('details', v)} />
          </Card>

          {/* PROFILE — Bio + SNS */}
          <Card>
            <SectionTitle>PROFILE — Bio &amp; SNS</SectionTitle>
            <DisplayHint>ページ左カラム・DETAILS下のPROFILEセクション（BIO / SNSリンク）</DisplayHint>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="Bio（アーティスト紹介）" hint="改行がそのまま表示される">
                <AutoResizeTextarea
                  value={form.bio}
                  onChange={e => setField('bio', e.target.value)}
                  variant="prose"
                  minHeight={120}
                  placeholder="アーティストの紹介文..."
                />
              </Field>
              <Field label="SNSリンク">
                <SnsLinksEditor value={form.snsLinks} onChange={v => setField('snsLinks', v)} />
              </Field>
            </div>
          </Card>

          {/* EXHIBITION — 過去展示歴 */}
          <Card>
            <SectionTitle>EXHIBITION — 過去展示歴</SectionTitle>
            <DisplayHint>ページ左カラム・PROFILEの下のEXHIBITIONセクションに年順で表示</DisplayHint>
            <PastExhibitionsEditor value={form.pastExhibitions} onChange={v => setField('pastExhibitions', v)} />
          </Card>

          {/* NOTICE */}
          <Card>
            <SectionTitle>NOTICE — 注意事項</SectionTitle>
            <DisplayHint>ページ左カラム最下部・EXHIBITIONの下に小さい薄い色のテキストで表示</DisplayHint>
            <AutoResizeTextarea
              value={form.notice}
              onChange={e => setField('notice', e.target.value)}
              variant="prose"
              minHeight={72}
              placeholder="入場に関する注意・備考など（任意）"
            />
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
            <input
              type="text" value={kv.caption}
              onChange={e => onChange(value.map(x => x.id === kv.id ? { ...x, caption: e.target.value } : x))}
              placeholder="この画像のキャプション（任意）"
              style={{ ...inputStyle, fontSize: '13px', padding: '7px 10px' }}
              className="admin-input"
            />
            <input
              type="text" value={kv.image.alt}
              onChange={e => onChange(value.map(x => x.id === kv.id ? { ...x, image: { ...x.image, alt: e.target.value } } : x))}
              placeholder="alt テキスト（アクセシビリティ用）"
              style={{ ...inputStyle, fontSize: '13px', padding: '7px 10px' }}
              className="admin-input"
            />
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
              <input
                type="text" value={pw.title}
                onChange={e => onChange(value.map(x => x.id === pw.id ? { ...x, title: e.target.value } : x))}
                placeholder="作品タイトル"
                style={{ ...inputStyle, fontSize: '13px', padding: '6px 8px' }}
                className="admin-input"
              />
              <input
                type="text" value={pw.year}
                onChange={e => onChange(value.map(x => x.id === pw.id ? { ...x, year: e.target.value } : x))}
                placeholder="年 (例: 2023)"
                style={{ ...inputStyle, fontSize: '13px', padding: '6px 8px' }}
                className="admin-input"
              />
            </div>
          </div>
        ))}
      </div>
      <UploadZone onUpload={handleUpload} />
    </div>
  )
}

// ─── Archive Works エディタ ───

function ArchiveWorksEditor({ value, slug, onChange }: { value: ArchiveWork[]; slug: string; onChange: (v: ArchiveWork[]) => void }) {
  async function handleUpload(files: File[]) {
    if (!slug) { alert('先にスラグを入力してください'); return }
    const newItems: ArchiveWork[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file); fd.append('section', 'me-no-hoshi'); fd.append('slug', slug)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        newItems.push({ id: `arc-${Date.now()}-${Math.random().toString(36).slice(2)}`, title: '', year: '', image: { src: data.src, alt: '', width: data.width, height: data.height } })
      }
    }
    onChange([...value, ...newItems])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {value.map((aw, index) => (
          <div key={aw.id} style={{ background: '#ffffff', border: `1px solid ${A.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '1', background: '#f0f0f0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aw.image.src} alt={aw.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', top: '6px', left: '6px', fontSize: '11px', padding: '2px 5px', borderRadius: '4px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontFamily: 'monospace' }}>{index + 1}</span>
              <button type="button" onClick={() => onChange(value.filter(x => x.id !== aw.id))}
                style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', background: '#fafafa' }}>
              <input
                type="text" value={aw.title}
                onChange={e => onChange(value.map(x => x.id === aw.id ? { ...x, title: e.target.value } : x))}
                placeholder="作品タイトル（任意）"
                style={{ ...inputStyle, fontSize: '13px', padding: '6px 8px' }}
                className="admin-input"
              />
              <input
                type="text" value={aw.year}
                onChange={e => onChange(value.map(x => x.id === aw.id ? { ...x, year: e.target.value } : x))}
                placeholder="年（任意）"
                style={{ ...inputStyle, fontSize: '13px', padding: '6px 8px' }}
                className="admin-input"
              />
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
          <input
            type="text" value={item.label}
            onChange={e => { const n = [...value]; n[i] = { ...n[i], label: e.target.value }; onChange(n) }}
            placeholder="ラベル (PERIOD)"
            style={{ ...inputStyle, fontSize: '13px' }}
            className="admin-input"
          />
          <input
            type="text" value={item.value}
            onChange={e => { const n = [...value]; n[i] = { ...n[i], value: e.target.value }; onChange(n) }}
            placeholder="値"
            style={{ ...inputStyle, fontSize: '13px' }}
            className="admin-input"
          />
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

// ─── 過去展示歴エディタ ───

function PastExhibitionsEditor({ value, onChange }: { value: PastExhibition[]; onChange: (v: PastExhibition[]) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {value.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '8px', alignItems: 'center' }}>
          <input
            type="text" value={item.year}
            onChange={e => { const n = [...value]; n[i] = { ...n[i], year: e.target.value }; onChange(n) }}
            placeholder="年"
            style={{ ...inputStyle, fontSize: '13px' }}
            className="admin-input"
          />
          <input
            type="text" value={item.info}
            onChange={e => { const n = [...value]; n[i] = { ...n[i], info: e.target.value }; onChange(n) }}
            placeholder="展示タイトル / 会場"
            style={{ ...inputStyle, fontSize: '13px' }}
            className="admin-input"
          />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
            style={{ width: '32px', height: '38px', border: `1px solid ${A.border}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', color: A.textMuted, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { year: '', info: '' }])}
        style={{ width: '100%', padding: '10px', border: `1px dashed ${A.border}`, borderRadius: '6px', background: 'transparent', color: A.textMuted, fontSize: '13px', cursor: 'pointer' }}>
        + 展示歴を追加
      </button>
    </div>
  )
}

// ─── SNSリンクエディタ ───

function SnsLinksEditor({ value, onChange }: { value: SnsLink[]; onChange: (v: SnsLink[]) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {value.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '8px', alignItems: 'center' }}>
          <input
            type="text" value={item.label}
            onChange={e => { const n = [...value]; n[i] = { ...n[i], label: e.target.value }; onChange(n) }}
            placeholder="instagram"
            style={{ ...inputStyle, fontSize: '13px' }}
            className="admin-input"
          />
          <input
            type="text" value={item.url}
            onChange={e => { const n = [...value]; n[i] = { ...n[i], url: e.target.value }; onChange(n) }}
            placeholder="https://..."
            style={{ ...inputStyle, fontSize: '13px' }}
            className="admin-input"
          />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
            style={{ width: '32px', height: '38px', border: `1px solid ${A.border}`, borderRadius: '6px', background: '#fff', cursor: 'pointer', color: A.textMuted, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { label: '', url: '' }])}
        style={{ width: '100%', padding: '10px', border: `1px dashed ${A.border}`, borderRadius: '6px', background: 'transparent', color: A.textMuted, fontSize: '13px', cursor: 'pointer' }}>
        + SNSリンクを追加
      </button>
    </div>
  )
}

// ─── 共通アップロードゾーン ───

function UploadZone({ onUpload }: { onUpload: (files: File[]) => void }) {
  return (
    <label
      className="admin-upload-zone"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '20px',
        borderRadius: '8px',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '13px', color: A.textMuted }}>クリックまたはドロップで追加</span>
      <input type="file" accept="image/*" multiple className="hidden"
        onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) onUpload(f); e.target.value = '' }} />
    </label>
  )
}

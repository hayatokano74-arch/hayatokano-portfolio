'use client'

import { TagInput } from './TagInput'
import { MediaUpload, MediaItem } from './MediaUpload'
import { useAdminForm } from './useAdminForm'
import { FormTopBar, ErrorBanner, AdminToast, SectionTitle, Field, Card } from './AdminUI'
import { inputStyle, textareaStyle, A } from './styles'

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

const EMPTY: WorkFormData = {
  slug: '', title: '', date: '', year: '', tags: [], pinned: false,
  exhibition_type: '', period: '', venue: '', address: '', media: [], content: '',
}

type Props = { initialData?: Partial<WorkFormData>; isNew?: boolean }

export function WorkForm({ initialData, isNew = false }: Props) {
  const { form, setField, saving, error, toast, handleSave, handleDelete, goBack } =
    useAdminForm<WorkFormData>(
      { ...EMPTY, ...initialData },
      {
        isNew: isNew ?? false,
        listPath: '/admin/works',
        saveUrl: (slug) => isNew ? '/api/admin/works' : `/api/admin/works/${slug}`,
        deleteUrl: (slug) => `/api/admin/works/${slug}`,
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

      {/* 2カラム */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '24px',
          padding: '28px 32px',
          alignItems: 'start',
        }}
      >
        {/* 左: メディア + 本文 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <SectionTitle>画像</SectionTitle>
            <MediaUpload
              section="works"
              slug={form.slug}
              value={form.media}
              onChange={v => setField('media', v)}
            />
          </Card>

          <Card>
            <SectionTitle>本文（Markdown）</SectionTitle>
            <textarea
              value={form.content}
              onChange={e => setField('content', e.target.value)}
              placeholder="作品の説明を入力..."
              rows={14}
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
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="作品タイトル"
                  style={inputStyle}
                />
              </Field>

              <Field label="スラグ" hint="URLに使用 (半角英数字)" required>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="work-title-2024"
                  disabled={!isNew}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.5, cursor: isNew ? 'text' : 'not-allowed' }}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="日付">
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setField('date', e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="年">
                  <input
                    type="text"
                    value={form.year}
                    onChange={e => setField('year', e.target.value)}
                    placeholder="2024"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="タグ">
                <TagInput
                  value={form.tags}
                  onChange={v => setField('tags', v)}
                  placeholder="入力してEnterで追加"
                />
              </Field>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: A.textPrimary,
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setField('pinned', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: A.textPrimary, cursor: 'pointer' }}
                />
                トップにピン留め
              </label>
            </div>
          </Card>

          <Card>
            <SectionTitle>展示情報</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="展示種別">
                <input
                  type="text"
                  value={form.exhibition_type}
                  onChange={e => setField('exhibition_type', e.target.value)}
                  placeholder="個展 / グループ展 / 野外展示"
                  style={inputStyle}
                />
              </Field>
              <Field label="期間">
                <input
                  type="text"
                  value={form.period}
                  onChange={e => setField('period', e.target.value)}
                  placeholder="2024.3.1 — 3.31"
                  style={inputStyle}
                />
              </Field>
              <Field label="会場">
                <input
                  type="text"
                  value={form.venue}
                  onChange={e => setField('venue', e.target.value)}
                  placeholder="ギャラリー名"
                  style={inputStyle}
                />
              </Field>
              <Field label="住所">
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}
                  placeholder="東京都..."
                  style={inputStyle}
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <AdminToast message={toast} />
    </div>
  )
}

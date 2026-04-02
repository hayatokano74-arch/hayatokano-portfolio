'use client'

import { TagInput } from './TagInput'
import { MediaUpload, MediaItem } from './MediaUpload'
import { useAdminForm } from './useAdminForm'
import { AutoResizeTextarea } from './AutoResizeTextarea'
import { FormTopBar, ErrorBanner, AdminToast, SectionTitle, Field, Card } from './AdminUI'
import { inputStyle, A } from './styles'

export type GardenFormData = {
  slug: string
  title: string
  date: string
  tags: string[]
  media: MediaItem[]
  content: string
}

const EMPTY: GardenFormData = {
  slug: '', title: '', date: '', tags: [], media: [], content: '',
}

type Props = { initialData?: Partial<GardenFormData>; isNew?: boolean }

export function GardenForm({ initialData, isNew = false }: Props) {
  const { form, setField, saving, error, toast, handleSave, handleDelete, goBack } =
    useAdminForm<GardenFormData>(
      { ...EMPTY, ...initialData },
      {
        isNew: isNew ?? false,
        listPath: '/admin/garden',
        saveUrl: (slug) => isNew ? '/api/admin/garden' : `/api/admin/garden/${slug}`,
        deleteUrl: (slug) => `/api/admin/garden/${slug}`,
      },
    )

  return (
    <div style={{ minHeight: '100vh', background: A.pageBg }}>
      <FormTopBar
        title={form.title || form.date}
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
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
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
              section="garden"
              slug={form.slug || form.date}
              value={form.media}
              onChange={v => setField('media', v)}
            />
          </Card>

          <Card>
            <SectionTitle>本文（Markdown）</SectionTitle>
            <AutoResizeTextarea
              value={form.content}
              onChange={e => setField('content', e.target.value)}
              variant="prose"
              minHeight={400}
              placeholder="今日の記録を入力..."
            />
          </Card>
        </div>

        {/* 右: メタ情報 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <SectionTitle>基本情報</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="日付" required>
                <input
                  type="date" value={form.date}
                  onChange={e => {
                    const d = e.target.value
                    setField('date', d)
                    // 新規作成時はslugを日付から自動生成
                    if (isNew && d) setField('slug', d)
                  }}
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="スラグ" hint="URLに使用（自動設定）">
                <input
                  type="text" value={form.slug}
                  onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="2026-04-02"
                  disabled={!isNew}
                  spellCheck={false}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.5, cursor: isNew ? 'text' : 'not-allowed' }}
                  className="admin-input"
                />
              </Field>
              <Field label="タイトル" hint="省略時は日付が使われます">
                <input
                  type="text" value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="2026.04.02"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="タグ">
                <TagInput value={form.tags} onChange={v => setField('tags', v)} placeholder="入力してEnterで追加" />
              </Field>
            </div>
          </Card>

          {/* 画像URLの挿入ヘルパー */}
          {form.media.length > 0 && (
            <Card>
              <SectionTitle>画像Markdown</SectionTitle>
              <p style={{ fontSize: '12px', color: A.textMuted, marginBottom: '12px', lineHeight: 1.6 }}>
                本文にコピペして使用してください
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {form.media.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code
                      style={{
                        flex: 1,
                        fontSize: '11px',
                        padding: '6px 8px',
                        background: A.pageBg,
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: A.textPrimary,
                        display: 'block',
                      }}
                    >
                      {`![](${m.src})`}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(`![](${m.src})`)}
                      style={{
                        flexShrink: 0,
                        padding: '5px 10px',
                        fontSize: '12px',
                        background: A.pageBg,
                        border: `1px solid ${A.border}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: A.textMuted,
                      }}
                    >
                      コピー
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <AdminToast message={toast} />
    </div>
  )
}

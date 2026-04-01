'use client'

import { useAdminForm } from './useAdminForm'
import { FormTopBar, ErrorBanner, AdminToast, SectionTitle, Field, Card } from './AdminUI'
import { inputStyle, textareaStyle, A } from './styles'

type FormData = { slug: string; title: string; date: string; content: string }
type Props = { initialData?: Partial<FormData>; isNew?: boolean }

export function NewsForm({ initialData, isNew = false }: Props) {
  const { form, setField, saving, error, toast, handleSave, handleDelete, goBack } =
    useAdminForm<FormData>(
      { slug: '', title: '', date: '', content: '', ...initialData },
      {
        isNew: isNew ?? false,
        listPath: '/admin/news',
        saveUrl: (slug) => isNew ? '/api/admin/news' : `/api/admin/news/${slug}`,
        deleteUrl: (slug) => `/api/admin/news/${slug}`,
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

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card>
          <SectionTitle>基本情報</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
            <Field label="タイトル" required>
              <input type="text" value={form.title} onChange={e => setField('title', e.target.value)}
                placeholder="ニュースタイトル" style={inputStyle} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Field label="スラグ" required>
                <input type="text" value={form.slug}
                  onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="news-2024-01" disabled={!isNew}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.5, cursor: isNew ? 'text' : 'not-allowed' }} />
              </Field>
              <Field label="日付">
                <input type="date" value={form.date ? form.date.replace(/\//g, '-') : ''}
                  onChange={e => setField('date', e.target.value.replace(/-/g, '/'))}
                  style={inputStyle} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>本文（Markdown）</SectionTitle>
          <textarea value={form.content} onChange={e => setField('content', e.target.value)}
            placeholder="ニュース本文を入力..." rows={18} style={textareaStyle} />
        </Card>
      </div>

      <AdminToast message={toast} />
    </div>
  )
}

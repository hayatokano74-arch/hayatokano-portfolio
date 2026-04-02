'use client'

import { TagInput } from './TagInput'
import { MediaUpload, MediaItem } from './MediaUpload'
import { useAdminForm } from './useAdminForm'
import { AutoResizeTextarea } from './AutoResizeTextarea'
import { FormTopBar, ErrorBanner, AdminToast, SectionTitle, Field, Card } from './AdminUI'
import { inputStyle, A } from './styles'

export type WorkFormData = {
  slug: string
  title: string
  date: string
  year: string
  tags: string[]
  pinned: boolean
  // 展示情報
  exhibition_type: string
  exhibition_title: string
  period: string
  venue: string
  address: string
  access: string
  hours: string
  closed: string
  admission: string
  artists: string
  organizer: string
  curator: string
  supported_by: string
  url: string
  // 作品情報
  medium: string
  dimensions: string
  edition: string
  series: string
  // クレジット
  credit_photo: string
  credit_design: string
  credit_text: string
  credit_sound: string
  credit_video: string
  credit_translation: string
  credit_cooperation: string
  award: string
  collection: string
  // メディア・本文
  media: MediaItem[]
  content: string
}

const EMPTY: WorkFormData = {
  slug: '', title: '', date: '', year: '', tags: [], pinned: false,
  exhibition_type: '', exhibition_title: '', period: '', venue: '', address: '',
  access: '', hours: '', closed: '', admission: '', artists: '',
  organizer: '', curator: '', supported_by: '', url: '',
  medium: '', dimensions: '', edition: '', series: '',
  credit_photo: '', credit_design: '', credit_text: '', credit_sound: '',
  credit_video: '', credit_translation: '', credit_cooperation: '',
  award: '', collection: '',
  media: [], content: '',
}

type Props = { initialData?: Partial<WorkFormData>; isNew?: boolean }

export function WorkForm({ initialData, isNew = false }: Props) {
  const { form, setField, saving, error, toast, handleSave, handleDelete, goBack } =
    useAdminForm<WorkFormData>(
      { ...EMPTY, ...initialData },
      {
        isNew: isNew ?? false,
        listPath: '/admin/works',
        saveUrl: (slug) => isNew ? '/api/admin/works' : `/api/admin/works?slug=${slug}`,
        deleteUrl: (slug) => `/api/admin/works?slug=${slug}`,
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
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '24px',
          padding: '28px 32px',
          alignItems: 'start',
        }}
      >
        {/* 左: メディア + 本文 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <SectionTitle>画像・映像</SectionTitle>
            <MediaUpload
              section="works"
              slug={form.slug}
              value={form.media}
              onChange={v => setField('media', v)}
            />
          </Card>

          <Card>
            <SectionTitle>本文（Markdown）</SectionTitle>
            <AutoResizeTextarea
              value={form.content}
              onChange={e => setField('content', e.target.value)}
              variant="markdown"
              minHeight={320}
              placeholder="作品の説明・ステートメントを入力..."
            />
          </Card>
        </div>

        {/* 右: メタ情報 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 基本情報 */}
          <Card>
            <SectionTitle>基本情報</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="タイトル" required>
                <input
                  type="text" value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="作品タイトル"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="スラグ" hint="URLに使用 (半角英数字)" required>
                <input
                  type="text" value={form.slug}
                  onChange={e => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="work-title-2024"
                  disabled={!isNew}
                  spellCheck={false}
                  style={{ ...inputStyle, opacity: isNew ? 1 : 0.5, cursor: isNew ? 'text' : 'not-allowed' }}
                  className="admin-input"
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="日付">
                  <input
                    type="date" value={form.date}
                    onChange={e => setField('date', e.target.value)}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: A.textPrimary, userSelect: 'none' }}>
                <input
                  type="checkbox" checked={form.pinned}
                  onChange={e => setField('pinned', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: A.textPrimary, cursor: 'pointer' }}
                />
                トップにピン留め
              </label>
            </div>
          </Card>

          {/* 展示情報 */}
          <Card>
            <SectionTitle>展示情報</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="展示種別" hint="Solo / Group / Art Festival">
                <input
                  type="text" value={form.exhibition_type}
                  onChange={e => setField('exhibition_type', e.target.value)}
                  placeholder="Solo Exhibition"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="展示タイトル" hint="グループ展・フェスティバルの場合">
                <input
                  type="text" value={form.exhibition_title}
                  onChange={e => setField('exhibition_title', e.target.value)}
                  placeholder="展示名（任意）"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="参加作家" hint="グループ展の場合（カンマ区切り）">
                <AutoResizeTextarea
                  value={form.artists}
                  onChange={e => setField('artists', e.target.value)}
                  variant="prose"
                  minHeight={56}
                  placeholder="作家名, 作家名, ..."
                />
              </Field>
              <Field label="期間">
                <input
                  type="text" value={form.period}
                  onChange={e => setField('period', e.target.value)}
                  placeholder="2024.3.1 — 3.31"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="会場">
                <input
                  type="text" value={form.venue}
                  onChange={e => setField('venue', e.target.value)}
                  placeholder="ギャラリー名"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="住所">
                <input
                  type="text" value={form.address}
                  onChange={e => setField('address', e.target.value)}
                  placeholder="宮城県石巻市..."
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="アクセス">
                <input
                  type="text" value={form.access}
                  onChange={e => setField('access', e.target.value)}
                  placeholder="最寄り駅・バス停など"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="営業時間">
                  <input
                    type="text" value={form.hours}
                    onChange={e => setField('hours', e.target.value)}
                    placeholder="11:00 – 18:00"
                    style={inputStyle} className="admin-input"
                  />
                </Field>
                <Field label="休廊日">
                  <input
                    type="text" value={form.closed}
                    onChange={e => setField('closed', e.target.value)}
                    placeholder="月・火曜日"
                    style={inputStyle} className="admin-input"
                  />
                </Field>
              </div>
              <Field label="入場料">
                <input
                  type="text" value={form.admission}
                  onChange={e => setField('admission', e.target.value)}
                  placeholder="無料 / ¥500"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="主催">
                <input
                  type="text" value={form.organizer}
                  onChange={e => setField('organizer', e.target.value)}
                  placeholder="主催団体名"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="キュレーター">
                <input
                  type="text" value={form.curator}
                  onChange={e => setField('curator', e.target.value)}
                  placeholder="キュレーター名"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="後援">
                <input
                  type="text" value={form.supported_by}
                  onChange={e => setField('supported_by', e.target.value)}
                  placeholder="後援機関・団体"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="関連URL">
                <input
                  type="text" value={form.url}
                  onChange={e => setField('url', e.target.value)}
                  placeholder="https://..."
                  style={inputStyle} className="admin-input"
                />
              </Field>
            </div>
          </Card>

          {/* 作品情報 */}
          <Card>
            <SectionTitle>作品情報</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              <Field label="素材・メディア">
                <input
                  type="text" value={form.medium}
                  onChange={e => setField('medium', e.target.value)}
                  placeholder="Inkjet Print, Lenticular Lens"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="サイズ">
                <input
                  type="text" value={form.dimensions}
                  onChange={e => setField('dimensions', e.target.value)}
                  placeholder="594 × 841 mm"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="エディション">
                  <input
                    type="text" value={form.edition}
                    onChange={e => setField('edition', e.target.value)}
                    placeholder="1/5"
                    style={inputStyle} className="admin-input"
                  />
                </Field>
                <Field label="シリーズ">
                  <input
                    type="text" value={form.series}
                    onChange={e => setField('series', e.target.value)}
                    placeholder="シリーズ名"
                    style={inputStyle} className="admin-input"
                  />
                </Field>
              </div>
              <Field label="受賞">
                <input
                  type="text" value={form.award}
                  onChange={e => setField('award', e.target.value)}
                  placeholder="受賞名称"
                  style={inputStyle} className="admin-input"
                />
              </Field>
              <Field label="コレクション">
                <input
                  type="text" value={form.collection}
                  onChange={e => setField('collection', e.target.value)}
                  placeholder="所蔵先"
                  style={inputStyle} className="admin-input"
                />
              </Field>
            </div>
          </Card>

          {/* クレジット */}
          <Card>
            <SectionTitle>クレジット</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: A.fieldGap }}>
              {(
                [
                  { key: 'credit_photo', label: '写真' },
                  { key: 'credit_design', label: 'デザイン' },
                  { key: 'credit_text', label: 'テキスト' },
                  { key: 'credit_sound', label: '音楽・サウンド' },
                  { key: 'credit_video', label: '映像' },
                  { key: 'credit_translation', label: '翻訳' },
                  { key: 'credit_cooperation', label: '協力' },
                ] as const
              ).map(({ key, label }) => (
                <Field key={key} label={label}>
                  <input
                    type="text" value={form[key]}
                    onChange={e => setField(key, e.target.value)}
                    placeholder={`${label}クレジット`}
                    style={inputStyle} className="admin-input"
                  />
                </Field>
              ))}
            </div>
          </Card>

        </div>
      </div>

      <AdminToast message={toast} />
    </div>
  )
}

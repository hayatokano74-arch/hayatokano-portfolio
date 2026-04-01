import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'
import { A } from '@/components/admin/styles'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'works')

type WorkMeta = {
  slug: string
  title: string
  date: string
  year: string
  tags: string[]
  pinned: boolean
  thumbnail: string | null
}

function getWorks(): WorkMeta[] {
  try {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
    return fs.readdirSync(CONTENT_DIR)
      .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('_'))
      .sort((a, b) => b.localeCompare(a))
      .map(filename => {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8')
        const { data } = matter(raw)
        return {
          slug: data.slug ?? filename.replace(/\.(mdx?)$/, ''),
          title: data.title ?? '(無題)',
          date: data.date ?? '',
          year: data.year ?? '',
          tags: data.tags ?? [],
          pinned: data.pinned ?? false,
          thumbnail: data.media?.[0]?.src ?? null,
        }
      })
  } catch { return [] }
}

export default function AdminWorksPage() {
  const works = getWorks()

  return (
    <div style={{ padding: '32px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: A.textPrimary, margin: 0 }}>Works</h1>
          <p style={{ fontSize: '13px', color: A.textMuted, margin: '4px 0 0' }}>{works.length} 件</p>
        </div>
        <Link
          href="/admin/works/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '40px',
            padding: '0 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#ffffff',
            background: A.textPrimary,
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          + 新規追加
        </Link>
      </div>

      {/* 一覧 */}
      {works.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px', border: `1.5px dashed ${A.border}`, borderRadius: '12px', gap: '16px',
        }}>
          <span style={{ fontSize: '14px', color: A.textMuted }}>まだ作品がありません</span>
          <Link href="/admin/works/new" style={{ fontSize: '13px', color: A.textPrimary, fontWeight: 600, textDecoration: 'underline' }}>
            最初の作品を追加
          </Link>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          border: `1px solid ${A.border}`,
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          {works.map((work, i) => (
            <Link
              key={work.slug}
              href={`/admin/works/${work.slug}`}
              className="admin-list-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 20px',
                borderBottom: i < works.length - 1 ? `1px solid ${A.border}` : 'none',
                textDecoration: 'none',
              }}
            >
              {/* サムネイル */}
              <div style={{
                width: '52px', height: '52px', borderRadius: '6px', flexShrink: 0, overflow: 'hidden',
                background: '#f0f0f0', border: `1px solid ${A.border}`,
              }}>
                {work.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={work.thumbnail} alt={work.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>

              {/* テキスト */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {work.pinned && (
                    <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: A.textPrimary, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
                      PIN
                    </span>
                  )}
                  <span style={{ fontSize: '15px', fontWeight: 600, color: A.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {work.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                  {work.date && (
                    <span style={{ fontSize: '12px', color: A.textMuted }}>{work.date}</span>
                  )}
                  {work.tags.slice(0, 3).map(tag => (
                    <span key={tag} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#f0f0f0', color: A.textMuted }}>
                      {tag}
                    </span>
                  ))}
                  {work.tags.length > 3 && (
                    <span style={{ fontSize: '12px', color: A.textMuted }}>+{work.tags.length - 3}</span>
                  )}
                </div>
              </div>

              {/* 矢印 */}
              <span style={{ fontSize: '16px', color: A.border, flexShrink: 0 }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

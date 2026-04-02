import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { A } from '@/components/admin/styles'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'garden')
const PER_PAGE = 50

function getAllFilenames(): string[] {
  try {
    return fs.readdirSync(CONTENT_DIR)
      .filter(f => f.endsWith('.md') && !f.startsWith('_'))
      .sort((a, b) => b.localeCompare(a)) // 新しい順
  } catch { return [] }
}

function loadPage(filenames: string[], page: number) {
  const start = (page - 1) * PER_PAGE
  const slice = filenames.slice(start, start + PER_PAGE)

  return slice.map(filename => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8')
    const { data, content } = matter(raw)
    const excerpt = content
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 60)
    return {
      slug: filename.replace(/\.md$/, ''),
      title: (data.title as string) ?? '',
      date: data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : (data.date as string) ?? '',
      tags: (data.tags as string[]) ?? [],
      excerpt,
    }
  })
}

export default async function GardenAdminPage(
  { searchParams }: { searchParams: Promise<{ page?: string }> }
) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))

  const allFilenames = getAllFilenames()
  const total = allFilenames.length
  const totalPages = Math.ceil(total / PER_PAGE)
  const currentPage = Math.min(page, totalPages || 1)

  const posts = loadPage(allFilenames, currentPage)

  return (
    <div style={{ padding: '36px', maxWidth: '860px' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ marginBottom: '4px' }}>
            <Link href="/admin" style={{ fontSize: '13px', color: A.textMuted, textDecoration: 'none' }}>
              ← ダッシュボード
            </Link>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: A.textPrimary, margin: 0, letterSpacing: '-0.01em' }}>
            Garden
            <span style={{ fontSize: '14px', fontWeight: 400, color: A.textMuted, marginLeft: '12px' }}>
              {total} 件
            </span>
          </h1>
        </div>
        <Link
          href="/admin/garden/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            background: A.textPrimary,
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          + 新規投稿
        </Link>
      </div>

      {/* 投稿一覧 */}
      <div
        style={{
          background: '#ffffff',
          border: `1px solid ${A.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        {posts.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: A.textMuted, fontSize: '14px' }}>
            投稿がありません
          </div>
        ) : (
          posts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/admin/garden/${post.slug}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr auto',
                gap: '16px',
                alignItems: 'center',
                padding: '13px 20px',
                borderBottom: i < posts.length - 1 ? `1px solid ${A.border}` : 'none',
                textDecoration: 'none',
                color: 'inherit',
              }}
              className="admin-list-row"
            >
              {/* 日付 */}
              <span style={{ fontSize: '13px', color: A.textMuted, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {post.date}
              </span>

              {/* タイトル + 抜粋 */}
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: A.textPrimary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.title || post.date}
                </span>
                {post.excerpt && (
                  <span style={{ fontSize: '12px', color: A.textMuted, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {post.excerpt}
                  </span>
                )}
              </div>

              {/* タグ */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {post.tags.slice(0, 2).map(tag => (
                  <span key={tag} style={{ fontSize: '11px', padding: '2px 7px', background: A.pageBg, border: `1px solid ${A.border}`, borderRadius: '4px', color: A.textMuted }}>
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {currentPage > 1 && (
            <Link
              href={`/admin/garden?page=${currentPage - 1}`}
              style={{ padding: '7px 16px', border: `1px solid ${A.border}`, borderRadius: '7px', fontSize: '13px', color: A.textPrimary, textDecoration: 'none', background: '#fff' }}
            >
              ← 前
            </Link>
          )}

          <span style={{ fontSize: '13px', color: A.textMuted, padding: '0 8px' }}>
            {currentPage} / {totalPages} ページ
            <span style={{ marginLeft: '8px', color: A.textMuted }}>（{(currentPage - 1) * PER_PAGE + 1}〜{Math.min(currentPage * PER_PAGE, total)} 件）</span>
          </span>

          {currentPage < totalPages && (
            <Link
              href={`/admin/garden?page=${currentPage + 1}`}
              style={{ padding: '7px 16px', border: `1px solid ${A.border}`, borderRadius: '7px', fontSize: '13px', color: A.textPrimary, textDecoration: 'none', background: '#fff' }}
            >
              次 →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

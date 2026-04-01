import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'

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
  } catch {
    return []
  }
}

export default function AdminWorksPage() {
  const works = getWorks()

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Works</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{works.length} 件</p>
        </div>
        <Link
          href="/admin/works/new"
          className="text-sm px-4 py-1.5 rounded font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--fg)', color: 'var(--bg)' }}
        >
          + 新規追加
        </Link>
      </div>

      {/* 一覧 */}
      {works.length === 0 ? (
        <div
          className="rounded-lg flex flex-col items-center justify-center py-16 gap-3"
          style={{ border: '1px dashed #d0d0d0' }}
        >
          <span className="text-sm" style={{ color: 'var(--muted)' }}>まだ作品がありません</span>
          <Link
            href="/admin/works/new"
            className="text-xs px-3 py-1.5 rounded transition-opacity hover:opacity-80"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
          >
            最初の作品を追加
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {works.map(work => (
            <Link
              key={work.slug}
              href={`/admin/works/${work.slug}`}
              className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors group hover:border-[#e0e0e0]"
              style={{ border: '1px solid transparent' }}
            >
              {/* サムネイル */}
              <div
                className="w-12 h-12 rounded flex-shrink-0 overflow-hidden"
                style={{ background: '#e8e8e8' }}
              >
                {work.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* テキスト */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {work.pinned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
                      PIN
                    </span>
                  )}
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                    {work.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {work.date && (
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{work.date}</span>
                  )}
                  {work.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {work.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#e8e8e8', color: 'var(--muted)' }}>
                          {tag}
                        </span>
                      ))}
                      {work.tags.length > 3 && (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>+{work.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 矢印 */}
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }}>
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

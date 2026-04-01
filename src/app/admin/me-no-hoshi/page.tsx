import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'me-no-hoshi')

type ItemMeta = {
  slug: string
  title: string
  date: string
  year: string
  tags: string[]
  thumbnail: string | null
}

function getItems(): ItemMeta[] {
  try {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
    return fs.readdirSync(CONTENT_DIR)
      .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('_'))
      .sort((a, b) => b.localeCompare(a))
      .map(filename => {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8')
        const { data } = matter(raw)
        return {
          slug: data.slug ?? filename.replace(/\.(mdx?|md)$/, ''),
          title: data.title ?? '(無題)',
          date: data.date ?? '',
          year: data.year ?? '',
          tags: data.tags ?? [],
          thumbnail: data.media?.[0]?.src ?? data.keyVisuals?.[0]?.image?.src ?? null,
        }
      })
  } catch {
    return []
  }
}

export default function AdminMeNoHoshiPage() {
  const items = getItems()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>目の星</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{items.length} 件</p>
        </div>
        <Link
          href="/admin/me-no-hoshi/new"
          className="text-sm px-4 py-1.5 rounded font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--fg)', color: 'var(--bg)' }}
        >
          + 新規追加
        </Link>
      </div>

      {items.length === 0 ? (
        <div
          className="rounded-lg flex flex-col items-center justify-center py-16 gap-3"
          style={{ border: '1px dashed #d0d0d0' }}
        >
          <span className="text-sm" style={{ color: 'var(--muted)' }}>まだデータがありません</span>
          <Link
            href="/admin/me-no-hoshi/new"
            className="text-xs px-3 py-1.5 rounded transition-opacity hover:opacity-80"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
          >
            最初のエントリを追加
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <Link
              key={item.slug}
              href={`/admin/me-no-hoshi/${item.slug}`}
              className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors group hover:border-[#e0e0e0]"
              style={{ border: '1px solid transparent' }}
            >
              <div
                className="w-12 h-12 rounded flex-shrink-0 overflow-hidden"
                style={{ background: '#e8e8e8' }}
              >
                {item.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block" style={{ color: 'var(--fg)' }}>
                  {item.title}
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  {item.date && (
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{item.date}</span>
                  )}
                  {item.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#e8e8e8', color: 'var(--muted)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

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

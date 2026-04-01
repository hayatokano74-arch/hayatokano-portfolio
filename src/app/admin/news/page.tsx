import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Link from 'next/link'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'news')

function getItems() {
  try {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
    return fs.readdirSync(CONTENT_DIR)
      .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('_'))
      .sort((a, b) => b.localeCompare(a))
      .map(filename => {
        const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8'))
        return {
          slug: data.slug ?? filename.replace(/\.(mdx?|md)$/, ''),
          title: data.title ?? '(無題)',
          date: data.date ?? '',
        }
      })
  } catch { return [] }
}

export default function AdminNewsPage() {
  const items = getItems()
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>News</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{items.length} 件</p>
        </div>
        <Link href="/admin/news/new"
          className="text-sm px-4 py-1.5 rounded font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
          + 新規追加
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg flex flex-col items-center justify-center py-16 gap-3" style={{ border: '1px dashed #d0d0d0' }}>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>まだニュースがありません</span>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <Link key={item.slug} href={`/admin/news/${item.slug}`}
              className="flex items-center gap-4 px-4 py-3 rounded-lg group hover:border-[#e0e0e0]"
              style={{ border: '1px solid transparent' }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block" style={{ color: 'var(--fg)' }}>{item.title}</span>
                {item.date && <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{item.date}</span>}
              </div>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

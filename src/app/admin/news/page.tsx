import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { AdminList } from '@/components/admin/AdminList'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'news')

export default function AdminNewsPage() {
  let items: ReturnType<typeof buildItem>[] = []
  try {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
    items = fs.readdirSync(CONTENT_DIR)
      .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('_'))
      .sort((a, b) => b.localeCompare(a))
      .map(filename => {
        const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8'))
        return buildItem(data, filename)
      })
  } catch { /* empty */ }

  return (
    <AdminList
      section="News"
      newHref="/admin/news/new"
      items={items}
      emptyText="まだニュースがありません"
    />
  )
}

function buildItem(data: Record<string, unknown>, filename: string) {
  const slug = (data.slug as string) ?? filename.replace(/\.(mdx?|md)$/, '')
  return {
    slug,
    href: `/admin/news/${slug}`,
    title: (data.title as string) ?? '(無題)',
    meta: (data.date as string) ?? '',
    thumbnail: null,
  }
}

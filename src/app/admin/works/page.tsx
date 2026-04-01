import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { AdminList } from '@/components/admin/AdminList'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'works')

export default function AdminWorksPage() {
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
      section="Works"
      newHref="/admin/works/new"
      items={items}
      emptyText="まだ作品がありません"
    />
  )
}

function buildItem(data: Record<string, unknown>, filename: string) {
  const slug = (data.slug as string) ?? filename.replace(/\.(mdx?|md)$/, '')
  return {
    slug,
    href: `/admin/works/${slug}`,
    title: (data.title as string) ?? '(無題)',
    meta: (data.date as string) ?? '',
    tags: (data.tags as string[]) ?? [],
    thumbnail: (data.media as { src: string }[] | undefined)?.[0]?.src ?? null,
    badge: data.pinned ? 'PIN' : undefined,
  }
}

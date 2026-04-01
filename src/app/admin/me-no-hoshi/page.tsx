import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { AdminList } from '@/components/admin/AdminList'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'me-no-hoshi')

export default function AdminMeNoHoshiPage() {
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
      section="目の星"
      newHref="/admin/me-no-hoshi/new"
      items={items}
      emptyText="まだ展示記録がありません"
    />
  )
}

function buildItem(data: Record<string, unknown>, filename: string) {
  const slug = (data.slug as string) ?? filename.replace(/\.(mdx?|md)$/, '')
  type Media = { src: string }
  type KV = { image: { src: string } }
  const thumb =
    (data.media as Media[] | undefined)?.[0]?.src ??
    (data.keyVisuals as KV[] | undefined)?.[0]?.image?.src ??
    null
  return {
    slug,
    href: `/admin/me-no-hoshi/${slug}`,
    title: (data.title as string) ?? '(無題)',
    subtitle: (data.subtitle as string) || undefined,
    meta: (data.date as string) ?? '',
    tags: (data.tags as string[]) ?? [],
    thumbnail: thumb,
  }
}

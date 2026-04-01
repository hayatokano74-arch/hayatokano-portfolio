import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { WorkForm } from '@/components/admin/WorkForm'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'works')

function findFile(slug: string): string | null {
  for (const ext of ['.mdx', '.md']) {
    const p = path.join(CONTENT_DIR, `${slug}${ext}`)
    if (fs.existsSync(p)) return p
  }
  return null
}

type Props = { params: Promise<{ slug: string }> }

export default async function AdminWorkEditPage({ params }: Props) {
  const { slug } = await params
  const filepath = findFile(slug)
  if (!filepath) notFound()

  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data, content } = matter(raw)

  const initialData = {
    slug: data.slug ?? slug,
    title: data.title ?? '',
    date: data.date ?? '',
    year: data.year ?? '',
    tags: data.tags ?? [],
    pinned: data.pinned ?? false,
    exhibition_type: data.exhibition_type ?? '',
    period: data.period ?? '',
    venue: data.venue ?? '',
    address: data.address ?? '',
    media: data.media ?? [],
    content,
  }

  return <WorkForm initialData={initialData} />
}

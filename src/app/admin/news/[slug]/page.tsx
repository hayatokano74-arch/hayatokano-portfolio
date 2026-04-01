import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { NewsForm } from '@/components/admin/NewsForm'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'news')

type Props = { params: Promise<{ slug: string }> }

export default async function AdminNewsEditPage({ params }: Props) {
  const { slug } = await params

  let filepath: string | null = null
  for (const ext of ['.mdx', '.md']) {
    const p = path.join(CONTENT_DIR, `${slug}${ext}`)
    if (fs.existsSync(p)) { filepath = p; break }
  }
  if (!filepath) notFound()

  const { data, content } = matter(fs.readFileSync(filepath, 'utf-8'))
  return <NewsForm initialData={{ slug: data.slug ?? slug, title: data.title ?? '', date: data.date ?? '', content }} />
}

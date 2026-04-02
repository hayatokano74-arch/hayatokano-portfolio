/** 静的エクスポート用: 管理ページは本番に含めない */
export const dynamicParams = false
export async function generateStaticParams() { return [{ slug: '_placeholder' }] }

import { GardenForm, GardenFormData } from '@/components/admin/GardenForm'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { notFound } from 'next/navigation'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'garden')

export default async function EditGardenPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const filepath = path.join(CONTENT_DIR, `${slug}.md`)

  if (!fs.existsSync(filepath)) notFound()

  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data, content } = matter(raw)

  const initialData: Partial<GardenFormData> = {
    slug,
    title: (data.title as string) ?? '',
    date: data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : (data.date as string) ?? '',
    tags: (data.tags as string[]) ?? [],
    media: (data.media as GardenFormData['media']) ?? [],
    content,
  }

  return <GardenForm initialData={initialData} isNew={false} />
}

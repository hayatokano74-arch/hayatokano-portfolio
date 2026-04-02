import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { MeNoHoshiForm } from '@/components/admin/MeNoHoshiForm'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'me-no-hoshi')

function findFile(slug: string): string | null {
  for (const ext of ['.mdx', '.md']) {
    const p = path.join(CONTENT_DIR, `${slug}${ext}`)
    if (fs.existsSync(p)) return p
  }
  return null
}

type Props = { params: Promise<{ slug: string }> }

export default async function AdminMeNoHoshiEditPage({ params }: Props) {
  const { slug } = await params
  const filepath = findFile(slug)
  if (!filepath) notFound()

  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data, content } = matter(raw)

  const initialData = {
    slug: data.slug ?? slug,
    title: data.title ?? '',
    subtitle: data.subtitle ?? '',
    date: data.date ?? '',
    year: data.year ?? '',
    tags: data.tags ?? [],
    showKeyVisuals: data.showKeyVisuals ?? true,
    showPastWorks: data.showPastWorks ?? true,
    showArchiveWorks: data.showArchiveWorks ?? true,
    details: data.details ?? [],
    media: data.media ?? [],
    keyVisuals: data.keyVisuals ?? [],
    pastWorks: data.pastWorks ?? [],
    archiveWorks: data.archiveWorks ?? [],
    bio: data.bio ?? '',
    pastExhibitions: data.pastExhibitions ?? [],
    snsLinks: data.snsLinks ?? [],
    notice: data.notice ?? '',
    heroCaption: data.heroCaption ?? '',
    archiveNote: data.archiveNote ?? '',
    content,
  }

  return <MeNoHoshiForm initialData={initialData} />
}

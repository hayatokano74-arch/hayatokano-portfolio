export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'works')

function findFile(slug: string): string | null {
  for (const ext of ['.mdx', '.md']) {
    const p = path.join(CONTENT_DIR, `${slug}${ext}`)
    if (fs.existsSync(p)) return p
  }
  return null
}

/** Works 一覧取得 / 1件取得（?slug=xxx） */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  // 1件取得
  if (slug) {
    const filepath = findFile(slug)
    if (!filepath) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const raw = fs.readFileSync(filepath, 'utf-8')
    const { data, content } = matter(raw)
    return NextResponse.json({ ...data, content })
  }

  // 一覧取得
  try {
    const files = fs.readdirSync(CONTENT_DIR)
      .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('_'))
      .sort((a, b) => b.localeCompare(a))

    const works = files.map(filename => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8')
      const { data } = matter(raw)
      return {
        slug: data.slug ?? filename.replace(/\.(mdx?|md)$/, ''),
        title: data.title ?? '',
        date: data.date ?? '',
        year: data.year ?? '',
        tags: data.tags ?? [],
        pinned: data.pinned ?? false,
        thumbnail: data.media?.[0]?.src ?? null,
        filename,
      }
    })

    return NextResponse.json(works)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** 新規Works作成 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, content, ...frontmatter } = body

    if (!slug) return NextResponse.json({ error: 'slug は必須です' }, { status: 400 })

    const filename = `${slug}.mdx`
    const filepath = path.join(CONTENT_DIR, filename)

    if (fs.existsSync(filepath)) {
      return NextResponse.json({ error: `${slug} はすでに存在します` }, { status: 409 })
    }

    const fileContent = matter.stringify(content ?? '', { slug, ...frontmatter })
    fs.writeFileSync(filepath, fileContent, 'utf-8')

    return NextResponse.json({ ok: true, slug })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** 更新（?slug=xxx） */
export async function PUT(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug は必須です' }, { status: 400 })

  const filepath = findFile(slug) ?? path.join(CONTENT_DIR, `${slug}.mdx`)

  try {
    const body = await request.json()
    const { content, ...frontmatter } = body
    const fileContent = matter.stringify(content ?? '', frontmatter)
    fs.writeFileSync(filepath, fileContent, 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** 削除（?slug=xxx） */
export async function DELETE(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug は必須です' }, { status: 400 })

  const filepath = findFile(slug)
  if (!filepath) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  fs.unlinkSync(filepath)
  return NextResponse.json({ ok: true })
}

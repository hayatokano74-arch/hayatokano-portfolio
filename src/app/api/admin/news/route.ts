import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'news')

export async function GET() {
  try {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
    const files = fs.readdirSync(CONTENT_DIR)
      .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('_'))
      .sort((a, b) => b.localeCompare(a))

    const items = files.map(filename => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8')
      const { data } = matter(raw)
      return {
        slug: data.slug ?? filename.replace(/\.(mdx?|md)$/, ''),
        title: data.title ?? '',
        date: data.date ?? '',
      }
    })

    return NextResponse.json(items)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, content, ...frontmatter } = body

    if (!slug) return NextResponse.json({ error: 'slug は必須です' }, { status: 400 })

    const filepath = path.join(CONTENT_DIR, `${slug}.mdx`)
    if (fs.existsSync(filepath)) {
      return NextResponse.json({ error: `${slug} はすでに存在します` }, { status: 409 })
    }

    fs.writeFileSync(filepath, matter.stringify(content ?? '', { slug, ...frontmatter }), 'utf-8')
    return NextResponse.json({ ok: true, slug })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'news')

function findFile(slug: string): string | null {
  for (const ext of ['.mdx', '.md']) {
    const p = path.join(CONTENT_DIR, `${slug}${ext}`)
    if (fs.existsSync(p)) return p
  }
  return null
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filepath = findFile(slug)
  if (!filepath) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, content } = matter(fs.readFileSync(filepath, 'utf-8'))
  return NextResponse.json({ ...data, content })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filepath = findFile(slug) ?? path.join(CONTENT_DIR, `${slug}.mdx`)
  try {
    const body = await request.json()
    const { content, ...frontmatter } = body
    fs.writeFileSync(filepath, matter.stringify(content ?? '', frontmatter), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filepath = findFile(slug)
  if (!filepath) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  fs.unlinkSync(filepath)
  return NextResponse.json({ ok: true })
}

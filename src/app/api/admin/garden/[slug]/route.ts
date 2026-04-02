import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'garden')

function findFile(slug: string): string | null {
  const p = path.join(CONTENT_DIR, `${slug}.md`)
  return fs.existsSync(p) ? p : null
}

/** 1件取得 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filepath = findFile(slug)
  if (!filepath) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data, content } = matter(raw)
  return NextResponse.json({ ...data, content })
}

/** 更新 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filepath = findFile(slug) ?? path.join(CONTENT_DIR, `${slug}.md`)

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

/** 削除 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const filepath = findFile(slug)
  if (!filepath) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  fs.unlinkSync(filepath)
  return NextResponse.json({ ok: true })
}

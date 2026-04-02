export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const section = formData.get('section') as string // 'works' | 'me-no-hoshi' etc.
    const slug = formData.get('slug') as string

    if (!file || !section || !slug) {
      return NextResponse.json({ error: 'file, section, slug は必須です' }, { status: 400 })
    }

    // 保存先ディレクトリを作成
    const uploadDir = path.join(process.cwd(), 'public', 'media', section, slug)
    fs.mkdirSync(uploadDir, { recursive: true })

    // ファイル名を生成（タイムスタンプ）
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filename = `${Date.now()}.${ext}`
    const filepath = path.join(uploadDir, filename)

    // ファイルを保存
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filepath, buffer)

    // 画像サイズを取得
    let width = 0
    let height = 0
    try {
      const meta = await sharp(filepath).metadata()
      width = meta.width ?? 0
      height = meta.height ?? 0
    } catch { /* サイズ取得失敗は無視 */ }

    const src = `/media/${section}/${slug}/${filename}`

    return NextResponse.json({ src, width, height })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

/** /admin/* ルートをパスワード保護する */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ログインページとAPI認証ルートは除外
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/auth')) {
    return NextResponse.next()
  }

  // /admin/* のみ対象
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('admin_token')?.value
  const password = process.env.ADMIN_PASSWORD

  // パスワード未設定の場合はそのまま通す（開発時）
  if (!password) return NextResponse.next()

  // 認証チェック
  if (token !== password) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}

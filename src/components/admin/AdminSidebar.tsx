'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'ダッシュボード', exact: true },
  { href: '/admin/works', label: 'Works' },
  { href: '/admin/me-no-hoshi', label: '目の星' },
  { href: '/admin/news', label: 'News' },
  { href: '/admin/garden', label: 'Garden' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <aside
      className="w-[200px] shrink-0 flex flex-col border-r"
      style={{
        background: '#fff',
        borderColor: '#e0e0e0',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* ロゴ */}
      <div className="px-5 py-6 border-b" style={{ borderColor: '#e0e0e0' }}>
        <span className="text-xs font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--fg)' }}>
          Admin
        </span>
      </div>

      {/* ナビ */}
      <nav className="flex-1 py-3">
        {NAV.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-5 py-2.5 text-sm transition-colors"
              style={{
                color: active ? 'var(--fg)' : 'var(--muted)',
                fontWeight: active ? 600 : 400,
                background: active ? 'var(--bg)' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ログアウト */}
      <div className="p-4 border-t" style={{ borderColor: '#e0e0e0' }}>
        <button
          onClick={handleLogout}
          className="w-full text-left px-2 py-2 text-xs rounded transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          ログアウト
        </button>
      </div>
    </aside>
  )
}

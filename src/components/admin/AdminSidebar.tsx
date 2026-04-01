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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '220px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#141414',
        zIndex: 100,
        overflowY: 'auto',
      }}
    >
      {/* ロゴ */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
          Hayato Kano
        </span>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
          管理画面
        </div>
      </div>

      {/* ナビ */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(item => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: active ? 600 : 400,
                color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderLeft: active ? '2px solid #ffffff' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ログアウト */}
      <div style={{ padding: '16px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '8px 0',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.35)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </div>
    </aside>
  )
}

import { DeployButton } from '@/components/admin/DeployButton'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import { A } from '@/components/admin/styles'

function countFiles(dir: string) {
  try {
    return fs.readdirSync(dir)
      .filter(f => (f.endsWith('.mdx') || f.endsWith('.md')) && !f.startsWith('_'))
      .length
  } catch { return 0 }
}

const SECTIONS = [
  { href: '/admin/works',        label: 'Works',  dir: 'content/works' },
  { href: '/admin/me-no-hoshi',  label: '目の星', dir: 'content/me-no-hoshi' },
  { href: '/admin/news',         label: 'News',   dir: 'content/news' },
  { href: '/admin/garden',       label: 'Garden', dir: 'content/garden' },
]

export default function AdminDashboard() {
  const counts = SECTIONS.map(s => ({
    ...s,
    count: countFiles(path.join(process.cwd(), s.dir)),
  }))

  return (
    <div style={{ padding: '36px', maxWidth: '640px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: A.textPrimary, margin: '0 0 28px', letterSpacing: '-0.01em' }}>
        ダッシュボード
      </h1>

      {/* コンテンツ件数 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
        {counts.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="admin-dashboard-card"
            style={{
              display: 'block',
              padding: '20px 24px',
              background: '#ffffff',
              border: `1px solid ${A.border}`,
              borderRadius: '12px',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: '32px', fontWeight: 300, color: A.textPrimary, lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.02em' }}>
              {s.count}
            </div>
            <div style={{ fontSize: '13px', color: A.textMuted, fontWeight: 500 }}>
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* デプロイ */}
      <div style={{ background: '#ffffff', border: `1px solid ${A.border}`, borderRadius: '12px', padding: '24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: A.textPrimary, marginBottom: '6px' }}>
          サイトを公開
        </div>
        <p style={{ fontSize: '13px', color: A.textMuted, margin: '0 0 20px', lineHeight: 1.6 }}>
          ビルドして Xserver に転送します。<br />変更を保存した後にここから公開してください。
        </p>
        <DeployButton />
      </div>
    </div>
  )
}

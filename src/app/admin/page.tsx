import { DeployButton } from '@/components/admin/DeployButton'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'

function countFiles(dir: string) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.mdx') || f.endsWith('.md')).filter(f => !f.startsWith('_')).length
  } catch { return 0 }
}

export default function AdminDashboard() {
  const worksCount = countFiles(path.join(process.cwd(), 'content/works'))
  const meNoHoshiCount = countFiles(path.join(process.cwd(), 'content/me-no-hoshi'))
  const newsCount = countFiles(path.join(process.cwd(), 'content/news'))
  const gardenCount = countFiles(path.join(process.cwd(), 'content/garden'))

  const sections = [
    { href: '/admin/works', label: 'Works', count: worksCount },
    { href: '/admin/me-no-hoshi', label: '目の星', count: meNoHoshiCount },
    { href: '/admin/news', label: 'News', count: newsCount },
    { href: '/admin/garden', label: 'Garden', count: gardenCount },
  ]

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="text-xs font-semibold tracking-[0.12em] uppercase mb-8" style={{ color: 'var(--muted)' }}>
        Dashboard
      </h1>

      {/* コンテンツ一覧 */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        {sections.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-lg p-5 block hover:shadow-sm transition-shadow"
          >
            <div className="text-2xl font-light mb-1" style={{ color: 'var(--fg)' }}>{s.count}</div>
            <div className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{s.label}</div>
          </Link>
        ))}
      </div>

      {/* デプロイ */}
      <div className="bg-white rounded-lg p-6">
        <div className="text-xs font-semibold tracking-[0.1em] uppercase mb-1" style={{ color: 'var(--fg)' }}>
          Deploy
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
          サイトをビルドしてXserverに転送します
        </p>
        <DeployButton />
      </div>
    </div>
  )
}

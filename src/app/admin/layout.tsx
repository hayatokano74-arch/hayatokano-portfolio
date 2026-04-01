import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata: Metadata = { title: 'Admin — Hayato Kano' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <AdminSidebar />
      <main style={{ marginLeft: '220px', minHeight: '100vh', background: '#f2f2f0' }}>
        {children}
      </main>
    </div>
  )
}

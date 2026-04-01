import Link from 'next/link'
import { A } from './styles'

type Item = {
  slug: string
  href: string
  title: string
  subtitle?: string
  meta?: string          // 日付など
  tags?: string[]
  thumbnail?: string | null
  badge?: string         // "PIN" など
}

type Props = {
  section: string        // "Works" / "目の星" など
  newHref: string
  items: Item[]
  emptyText?: string
}

/**
 * 管理画面: 一覧ページの共通レイアウト
 * Server Component として使用（インタラクションなし）
 */
export function AdminList({ section, newHref, items, emptyText }: Props) {
  return (
    <div style={{ padding: '36px 36px 60px' }}>

      {/* ページヘッダー */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: A.textPrimary, margin: 0, letterSpacing: '-0.01em' }}>
            {section}
          </h1>
          <p style={{ fontSize: '13px', color: A.textMuted, margin: '4px 0 0' }}>
            {items.length} 件
          </p>
        </div>
        <Link
          href={newHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '40px',
            padding: '0 18px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#ffffff',
            background: A.textPrimary,
            borderRadius: '8px',
            textDecoration: 'none',
            letterSpacing: '0.01em',
          }}
        >
          + 新規追加
        </Link>
      </div>

      {/* コンテンツ */}
      {items.length === 0 ? (
        <EmptyState href={newHref} text={emptyText ?? `まだ ${section} がありません`} />
      ) : (
        <div style={{
          background: '#ffffff',
          border: `1px solid ${A.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <ListRow
              key={item.slug}
              item={item}
              isLast={i === items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 行コンポーネント ───

function ListRow({ item, isLast }: { item: Item; isLast: boolean }) {
  return (
    <Link
      href={item.href}
      className="admin-list-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${A.border}`,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {/* サムネイル */}
      <Thumbnail src={item.thumbnail} alt={item.title} />

      {/* テキスト */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          {item.badge && (
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
              padding: '2px 6px', borderRadius: '4px',
              background: A.textPrimary, color: '#ffffff', flexShrink: 0,
            }}>
              {item.badge}
            </span>
          )}
          <span style={{
            fontSize: '15px', fontWeight: 600, color: A.textPrimary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {item.meta && (
            <span style={{ fontSize: '12px', color: A.textMuted }}>{item.meta}</span>
          )}
          {item.subtitle && (
            <span style={{ fontSize: '12px', color: A.textMuted }}>{item.subtitle}</span>
          )}
          {item.tags?.slice(0, 3).map(tag => (
            <span key={tag} style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
              background: '#f0f0ee', color: A.textMuted, letterSpacing: '0.01em',
            }}>
              {tag}
            </span>
          ))}
          {(item.tags?.length ?? 0) > 3 && (
            <span style={{ fontSize: '12px', color: A.textMuted }}>
              +{(item.tags?.length ?? 0) - 3}
            </span>
          )}
        </div>
      </div>

      {/* 矢印 */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#c8c8c8' }}>
        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}

// ─── サムネイル ───

function Thumbnail({ src, alt }: { src?: string | null; alt: string }) {
  return (
    <div style={{
      width: '56px',
      height: '56px',
      borderRadius: '8px',
      flexShrink: 0,
      overflow: 'hidden',
      background: '#f0f0ee',
      border: `1px solid ${A.border}`,
    }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </div>
  )
}

// ─── 空状態 ───

function EmptyState({ href, text }: { href: string; text: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '16px',
      padding: '80px 24px',
      background: '#ffffff',
      border: `1px solid ${A.border}`,
      borderRadius: '12px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        background: '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p style={{ fontSize: '14px', color: A.textMuted, margin: 0, textAlign: 'center' }}>{text}</p>
      <Link href={href} style={{
        fontSize: '14px', fontWeight: 600, color: A.textPrimary,
        textDecoration: 'none', padding: '8px 20px',
        border: `1.5px solid ${A.textPrimary}`, borderRadius: '8px',
      }}>
        最初の1件を追加
      </Link>
    </div>
  )
}

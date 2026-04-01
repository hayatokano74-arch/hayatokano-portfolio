'use client'

import { useState, useRef, DragEvent } from 'react'
import Image from 'next/image'
import { A } from './styles'

export type MediaItem = {
  id: string
  type: 'image'
  src: string
  alt: string
  width: number
  height: number
}

type Props = {
  section: string
  slug: string
  value: MediaItem[]
  onChange: (items: MediaItem[]) => void
}

export function MediaUpload({ section, slug, value, onChange }: Props) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragItemIndex = useRef<number | null>(null)

  async function uploadFiles(files: File[]) {
    if (!slug) { alert('先にスラグを入力してください'); return }
    setUploading(true)
    const newItems: MediaItem[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file); fd.append('section', section); fd.append('slug', slug)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        newItems.push({
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'image', src: data.src, alt: '', width: data.width, height: data.height,
        })
      }
    }
    onChange([...value, ...newItems])
    setUploading(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) uploadFiles(files)
  }

  function handleDragEnter(index: number) {
    if (dragItemIndex.current === null || dragItemIndex.current === index) return
    const next = [...value]
    const [dragged] = next.splice(dragItemIndex.current, 1)
    next.splice(index, 0, dragged)
    dragItemIndex.current = index
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 画像グリッド */}
      {value.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {value.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => { dragItemIndex.current = index }}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={e => e.preventDefault()}
              style={{
                position: 'relative',
                borderRadius: '6px',
                overflow: 'hidden',
                border: `1px solid ${A.border}`,
                cursor: 'grab',
                background: '#f5f5f5',
              }}
            >
              {/* サムネイル */}
              <div style={{ aspectRatio: '1', position: 'relative' }}>
                <Image src={item.src} alt={item.alt || ''} fill className="object-cover" unoptimized />
              </div>

              {/* 番号バッジ */}
              <span style={{
                position: 'absolute', top: '6px', left: '6px',
                fontSize: '11px', fontFamily: 'monospace', padding: '2px 5px',
                borderRadius: '4px', background: 'rgba(0,0,0,0.55)', color: '#fff',
              }}>
                {index + 1}
              </span>

              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => onChange(value.filter(i => i.id !== item.id))}
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none',
                  cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="削除"
              >
                ×
              </button>

              {/* ALT テキスト */}
              <input
                type="text"
                value={item.alt}
                onChange={e => onChange(value.map(i => i.id === item.id ? { ...i, alt: e.target.value } : i))}
                placeholder="alt テキスト"
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  fontSize: '12px',
                  border: 'none',
                  borderTop: `1px solid ${A.border}`,
                  background: '#ffffff',
                  color: A.textPrimary,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* アップロードゾーン */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '28px 16px',
          border: `1.5px dashed ${isDraggingOver ? A.textPrimary : A.border}`,
          borderRadius: '8px',
          background: isDraggingOver ? 'rgba(0,0,0,0.03)' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onDragOver={e => { e.preventDefault(); setIsDraggingOver(true) }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={A.textMuted} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span style={{ fontSize: '13px', color: A.textMuted }}>
          {uploading ? 'アップロード中...' : 'クリックまたはドラッグ&ドロップ'}
        </span>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) uploadFiles(f); e.target.value = '' }} />
      </div>

      {value.length > 0 && (
        <p style={{ fontSize: '12px', color: A.textMuted, margin: 0 }}>ドラッグで順序を変更できます</p>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, DragEvent } from 'react'
import Image from 'next/image'

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
  // ドラッグ&ドロップ並べ替え用
  const dragItemIndex = useRef<number | null>(null)

  async function uploadFiles(files: File[]) {
    if (!slug) {
      alert('先にスラグを入力してください')
      return
    }
    setUploading(true)
    const newItems: MediaItem[] = []

    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('section', section)
      fd.append('slug', slug)

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const data = await res.json()
        newItems.push({
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'image',
          src: data.src,
          alt: '',
          width: data.width,
          height: data.height,
        })
      }
    }

    onChange([...value, ...newItems])
    setUploading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) uploadFiles(files)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length > 0) uploadFiles(files)
  }

  function handleAltChange(id: string, alt: string) {
    onChange(value.map(item => item.id === id ? { ...item, alt } : item))
  }

  function handleRemove(id: string) {
    onChange(value.filter(item => item.id !== id))
  }

  // 並べ替え（ドラッグ）
  function handleDragStart(index: number) {
    dragItemIndex.current = index
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
    <div className="space-y-3">
      {/* 画像グリッド */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={e => e.preventDefault()}
              className="relative group rounded overflow-hidden"
              style={{ background: 'var(--media-bg)', cursor: 'grab' }}
            >
              {/* サムネイル */}
              <div className="aspect-square relative">
                <Image
                  src={item.src}
                  alt={item.alt || ''}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* 番号バッジ */}
              <span
                className="absolute top-1 left-1 text-[10px] font-mono px-1 py-0.5 rounded"
                style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
              >
                {index + 1}
              </span>

              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                aria-label="削除"
              >
                ×
              </button>

              {/* ALTテキスト */}
              <input
                type="text"
                value={item.alt}
                onChange={e => handleAltChange(item.id, e.target.value)}
                placeholder="alt テキスト"
                className="w-full px-1.5 py-1 text-[11px] outline-none border-t"
                style={{
                  background: '#fff',
                  borderColor: '#e0e0e0',
                  color: 'var(--fg)',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* アップロードゾーン */}
      <div
        className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors"
        style={{
          borderColor: isDraggingOver ? 'var(--fg)' : '#d0d0d0',
          background: isDraggingOver ? 'var(--bg-subtle)' : 'transparent',
        }}
        onDragOver={e => { e.preventDefault(); setIsDraggingOver(true) }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--muted)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {uploading ? 'アップロード中...' : 'クリックまたはドラッグ&ドロップ'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {value.length > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
          ドラッグで順序を変更できます
        </p>
      )}
    </div>
  )
}

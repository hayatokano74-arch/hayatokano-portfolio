'use client'

import { useState, KeyboardEvent } from 'react'
import { A } from './styles'

type Props = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = '入力してEnterで追加' }: Props) {
  const [input, setInput] = useState('')

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setInput('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '8px 10px',
        minHeight: '44px',
        background: '#ffffff',
        border: `1px solid ${A.border}`,
        borderRadius: '6px',
        cursor: 'text',
        alignItems: 'center',
      }}
      onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
    >
      {value.map(tag => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            background: '#141414',
            color: '#ffffff',
            borderRadius: '4px',
            fontSize: '13px',
            lineHeight: 1.4,
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter(t => t !== tag))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '0',
              fontSize: '14px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={`${tag}を削除`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={value.length === 0 ? placeholder : ''}
        style={{
          flex: '1 1 120px',
          minWidth: '80px',
          fontSize: '14px',
          color: A.textPrimary,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: '2px 0',
        }}
      />
    </div>
  )
}

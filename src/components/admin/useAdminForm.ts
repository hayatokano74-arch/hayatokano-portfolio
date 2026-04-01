'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Options = {
  isNew: boolean
  listPath: string
  saveUrl: (slug: string) => string
  deleteUrl: (slug: string) => string
}

/**
 * 管理フォーム共通ロジック:
 * - 保存 / 削除 API 呼び出し
 * - 未保存変更の検出 + 離脱警告
 * - Cmd+S ショートカット
 * - 成功トースト
 */
export function useAdminForm<T extends { slug: string; title?: string | unknown }>(
  initial: T,
  opts: Options,
) {
  const router = useRouter()
  const [form, setForm] = useState<T>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const isDirty = useRef(false)
  const savedRef = useRef(initial)

  // フォーム変更追跡
  function setField<K extends keyof T>(key: K, val: T[K]) {
    setForm(prev => {
      isDirty.current = true
      return { ...prev, [key]: val }
    })
  }

  // 離脱前警告
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // トースト自動消去
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(t)
  }, [toast])

  // 保存処理
  const handleSave = useCallback(async () => {
    if (!(form.title as string | undefined)?.toString().trim()) { setError('タイトルは必須です'); return }
    if (!form.slug?.toString().trim()) { setError('スラグは必須です'); return }
    setError('')
    setSaving(true)
    try {
      const url = opts.isNew
        ? opts.saveUrl('')
        : opts.saveUrl(form.slug)
      const method = opts.isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '保存に失敗しました')
        return
      }
      isDirty.current = false
      savedRef.current = form
      setToast('保存しました')
      if (opts.isNew) {
        router.push(opts.listPath)
        router.refresh()
      } else {
        router.refresh()
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }, [form, opts, router])

  // 削除処理
  const handleDelete = useCallback(async () => {
    if (!confirm(`「${form.title as string | undefined ?? form.slug}」を削除しますか？\n\nこの操作は取り消せません。`)) return
    setSaving(true)
    try {
      const res = await fetch(opts.deleteUrl(form.slug), { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '削除に失敗しました')
        return
      }
      isDirty.current = false
      router.push(opts.listPath)
      router.refresh()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }, [form, opts, router])

  // 一覧に戻る（未保存チェック付き）
  const goBack = useCallback(() => {
    if (isDirty.current && !confirm('変更が保存されていません。一覧に戻りますか？')) return
    router.push(opts.listPath)
  }, [opts.listPath, router])

  // Cmd+S ショートカット
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  return { form, setField, saving, error, toast, handleSave, handleDelete, goBack }
}

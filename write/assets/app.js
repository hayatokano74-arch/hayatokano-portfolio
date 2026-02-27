/**
 * Garden Write — エディタ SPA
 *
 * 機能:
 * - 投稿の CRUD（WP REST API 経由）
 * - フォルダ管理（WP カテゴリ = フォルダ）
 * - タイプライターモード
 * - マークダウンツールバー
 * - 画像アップロード（テキスト内挿入）
 * - 自動保存（3秒デバウンス）
 * - ダーク/ライト テーマ切替
 * - マークダウンプレビュー
 */

;(function () {
  'use strict'

  /* ============================================
   * 定数・状態
   * ============================================ */
  const API = '/api'
  const AUTOSAVE_DELAY = 3000
  const TYPEWRITER_MODE = true

  const state = {
    posts: [],
    folders: [],
    currentPostId: null,
    currentFolderId: null,
    dirty: false,
    saving: false,
    autosaveTimer: null,
    typewriter: TYPEWRITER_MODE,
  }

  /* ============================================
   * DOM 参照
   * ============================================ */
  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => document.querySelectorAll(sel)

  const dom = {
    sidebar: $('#sidebar'),
    folderTree: $('#folder-tree'),
    postList: $('#post-list'),
    editor: $('#editor'),
    editorScroll: $('#editor-scroll'),
    preview: $('#preview'),
    titleInput: $('#post-title'),
    dateLabel: $('#post-date'),
    statusLabel: $('#post-status'),
    btnNew: $('#btn-new'),
    btnPublish: $('#btn-publish'),
    btnTheme: $('#btn-theme'),
    btnLogout: $('#btn-logout'),
    btnSidebarToggle: $('#btn-sidebar-toggle'),
    btnMobileBack: $('#btn-mobile-back'),
    btnPhoto: $('#btn-photo'),
    fileInput: $('#file-input'),
    tabs: $$('.tab'),
    toolbar: $('#md-toolbar'),
  }

  /* ============================================
   * 初期化
   * ============================================ */
  async function init() {
    /* テーマ復元 */
    const savedTheme = localStorage.getItem('garden-theme') || 'dark'
    document.body.setAttribute('data-theme', savedTheme)

    /* タイプライターモード用: ミラーdiv作成（カーソル位置計測用） */
    if (state.typewriter) {
      const mirror = document.createElement('div')
      mirror.id = 'typewriter-mirror'
      mirror.setAttribute('aria-hidden', 'true')
      mirror.style.cssText = `
        position: absolute; top: 0; left: 0; right: 0;
        visibility: hidden; white-space: pre-wrap; word-wrap: break-word;
        pointer-events: none; overflow: hidden;
      `
      dom.editorScroll.appendChild(mirror)
    }

    /* 保存インジケーター追加 */
    const indicator = document.createElement('div')
    indicator.className = 'save-indicator'
    indicator.id = 'save-indicator'
    document.body.appendChild(indicator)

    /* サイドバーバックドロップ（モバイル用） */
    const backdrop = document.createElement('div')
    backdrop.className = 'sidebar-backdrop'
    backdrop.id = 'sidebar-backdrop'
    document.body.appendChild(backdrop)
    backdrop.addEventListener('click', toggleSidebar)

    /* コンテキストメニュー */
    createContextMenu()

    /* モーダル */
    createModal()

    /* フォルダピッカー */
    createFolderPicker()

    /* イベント登録 */
    bindEvents()

    /* データ読み込み */
    await Promise.all([loadFolders(), loadPosts()])

    /* モバイル: 初期状態でサイドバー（フォルダ＆投稿一覧）を表示 */
    if (window.innerWidth <= 768) {
      dom.sidebar.classList.remove('hidden')
    }

    /* デスクトップ: 最新の投稿を選択 */
    if (window.innerWidth > 768 && state.posts.length > 0) {
      selectPost(state.posts[0].id)
    } else if (window.innerWidth > 768) {
      newPost()
    }
  }

  /* ============================================
   * イベント
   * ============================================ */
  function bindEvents() {
    /* 新規投稿 */
    dom.btnNew.addEventListener('click', newPost)

    /* 公開 */
    dom.btnPublish.addEventListener('click', publishPost)

    /* テーマ切替 */
    dom.btnTheme.addEventListener('click', toggleTheme)

    /* ログアウト */
    dom.btnLogout.addEventListener('click', logout)

    /* サイドバー開閉 */
    dom.btnSidebarToggle.addEventListener('click', toggleSidebar)

    /* モバイル戻るボタン → サイドバーを全画面表示 */
    if (dom.btnMobileBack) {
      dom.btnMobileBack.addEventListener('click', openSidebarMobile)
    }

    /* エディタ入力 → 自動保存 */
    dom.editor.addEventListener('input', onEditorInput)
    dom.titleInput.addEventListener('input', onEditorInput)

    /* タブ切替 */
    dom.tabs.forEach((tab) => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab))
    })

    /* マークダウンツールバー */
    dom.toolbar.querySelectorAll('button[data-insert]').forEach((btn) => {
      btn.addEventListener('click', () => insertMarkdown(btn.dataset.insert))
    })

    /* 内部リンクボタン — [[ウィキリンク]] */
    const btnLink = document.getElementById('btn-link')
    if (btnLink) btnLink.addEventListener('click', insertWikiLink)

    /* 写真ボタン */
    dom.btnPhoto.addEventListener('click', () => dom.fileInput.click())
    dom.fileInput.addEventListener('change', onFileSelect)

    /* タイプライターモード: カーソル位置をスクロール */
    dom.editor.addEventListener('keyup', typewriterScroll)
    dom.editor.addEventListener('click', typewriterScroll)

    /* キーボードショートカット */
    document.addEventListener('keydown', onKeyDown)
  }

  /* ============================================
   * テーマ
   * ============================================ */
  function toggleTheme() {
    const current = document.body.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    document.body.setAttribute('data-theme', next)
    localStorage.setItem('garden-theme', next)
  }

  /* ============================================
   * サイドバー
   * ============================================ */
  function toggleSidebar() {
    dom.sidebar.classList.toggle('hidden')
    const backdrop = $('#sidebar-backdrop')
    backdrop.classList.toggle('show', !dom.sidebar.classList.contains('hidden'))
  }

  /**
   * モバイル: サイドバーを全画面で開く
   * Bear/Ulysses風に、エディタ→投稿リストへ「戻る」動作
   */
  function openSidebarMobile() {
    dom.sidebar.classList.remove('hidden')
  }

  /**
   * モバイル: サイドバーを閉じてエディタに集中
   */
  function closeSidebarMobile() {
    dom.sidebar.classList.add('hidden')
  }

  /* ============================================
   * フォルダ
   * ============================================ */
  async function loadFolders() {
    try {
      const res = await fetch(`${API}/folders.php`)
      const data = await res.json()
      if (data.ok) {
        state.folders = data.folders
        renderFolders()
      }
    } catch (e) {
      console.error('フォルダ読み込みエラー:', e)
      /* オフラインフォールバック */
      state.folders = [{ id: 0, name: 'すべて', count: 0 }]
      renderFolders()
    }
  }

  /**
   * フラット配列をツリー構造に変換
   */
  function buildFolderTree(folders) {
    const map = {}
    const roots = []

    folders.forEach((f) => {
      map[f.id] = { ...f, children: [] }
    })

    folders.forEach((f) => {
      if (f.parent && map[f.parent]) {
        map[f.parent].children.push(map[f.id])
      } else {
        roots.push(map[f.id])
      }
    })

    return roots
  }

  function renderFolders() {
    dom.folderTree.innerHTML = ''

    /* 「すべて」を先頭に */
    const allItem = createFolderItem({ id: 0, name: 'すべて', count: state.posts.length }, 0)
    if (state.currentFolderId === null || state.currentFolderId === 0) {
      allItem.classList.add('active')
    }
    dom.folderTree.appendChild(allItem)

    /* ツリー構造でレンダリング */
    const tree = buildFolderTree(state.folders)
    tree.forEach((folder) => renderFolderNode(folder, 0, dom.folderTree))

    /* フォルダ追加ボタン */
    const addBtn = document.createElement('div')
    addBtn.className = 'folder-item'
    addBtn.innerHTML = '<span class="folder-icon">+</span><span>フォルダを追加</span>'
    addBtn.addEventListener('click', () => promptNewFolder(0))
    dom.folderTree.appendChild(addBtn)
  }

  /**
   * フォルダノードを再帰的にレンダリング
   */
  function renderFolderNode(folder, level, container) {
    const hasChildren = folder.children && folder.children.length > 0
    const el = createFolderItem(folder, level, hasChildren)
    if (state.currentFolderId === folder.id) el.classList.add('active')
    container.appendChild(el)

    /* 子フォルダ */
    if (hasChildren) {
      const childContainer = document.createElement('div')
      childContainer.className = 'folder-children'
      childContainer.dataset.parentId = folder.id

      /* 展開状態を復元 */
      const expanded = state.expandedFolders && state.expandedFolders.has(folder.id)
      if (!expanded) childContainer.classList.add('hidden')

      folder.children.forEach((child) => renderFolderNode(child, level + 1, childContainer))
      container.appendChild(childContainer)
    }
  }

  function createFolderItem(folder, level = 0, hasChildren = false) {
    const el = document.createElement('div')
    el.className = `folder-item folder-level-${Math.min(level, 3)}`
    el.dataset.folderId = folder.id

    const toggleHtml = hasChildren
      ? `<span class="folder-toggle ${state.expandedFolders && state.expandedFolders.has(folder.id) ? 'expanded' : ''}">▶</span>`
      : '<span class="folder-toggle-spacer"></span>'

    const moreHtml = folder.id !== 0
      ? '<button class="folder-item-more" type="button" title="操作">⋯</button>'
      : ''

    el.innerHTML = `
      ${toggleHtml}
      <span class="folder-icon">📁</span>
      <span class="folder-name">${escapeHtml(folder.name)}</span>
      <span class="folder-count">${folder.count || ''}</span>
      ${moreHtml}
    `

    /* フォルダ全体クリック → 展開/折畳 + 投稿フィルター */
    el.addEventListener('click', () => {
      if (hasChildren) {
        toggleFolderExpanded(folder.id)
      }
      state.currentFolderId = folder.id
      loadPosts()
      renderFolders()
    })

    /* ⋯ボタン → コンテキストメニュー（スマホ対応） */
    const moreBtn = el.querySelector('.folder-item-more')
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        showFolderContextMenu(e, folder)
      })
    }

    /* 右クリック → コンテキストメニュー（デスクトップ） */
    if (folder.id !== 0) {
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        showFolderContextMenu(e, folder)
      })
    }

    return el
  }

  /**
   * フォルダ展開/折畳トグル
   */
  function toggleFolderExpanded(folderId) {
    if (!state.expandedFolders) state.expandedFolders = new Set()
    if (state.expandedFolders.has(folderId)) {
      state.expandedFolders.delete(folderId)
    } else {
      state.expandedFolders.add(folderId)
    }
    renderFolders()
  }

  async function promptNewFolder(parentId = 0) {
    const label = parentId ? 'サブフォルダ名' : 'フォルダ名'
    const name = await showModal('新しいフォルダ', label)
    if (!name) return

    try {
      const body = { action: 'create', name }
      if (parentId) body.parent = parentId

      const res = await fetch(`${API}/folders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        /* 親フォルダを展開 */
        if (parentId) {
          if (!state.expandedFolders) state.expandedFolders = new Set()
          state.expandedFolders.add(parentId)
        }
        await loadFolders()
      } else {
        alert(data.error || 'フォルダ作成に失敗しました')
      }
    } catch (e) {
      alert('通信エラーが発生しました')
    }
  }

  /* ============================================
   * 投稿リスト
   * ============================================ */
  async function loadPosts() {
    try {
      const params = new URLSearchParams()
      if (state.currentFolderId && state.currentFolderId !== 0) {
        params.set('folder', state.currentFolderId)
      }
      const res = await fetch(`${API}/posts.php?${params}`)
      const data = await res.json()
      if (data.ok) {
        state.posts = data.posts
        renderPosts()
      }
    } catch (e) {
      console.error('投稿読み込みエラー:', e)
    }
  }

  function renderPosts() {
    dom.postList.innerHTML = ''
    if (state.posts.length === 0) {
      dom.postList.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:13px;">投稿がありません</div>'
      return
    }

    state.posts.forEach((post) => {
      const el = document.createElement('div')
      el.className = 'post-item' + (post.id === state.currentPostId ? ' active' : '')
      el.dataset.postId = post.id

      const title = post.title || formatDate(post.date)
      const excerpt = (post.content || '').replace(/[#*_`>\[\]!\-]/g, '').substring(0, 60)

      el.innerHTML = `
        <div class="post-item-body">
          <div class="post-item-title">${escapeHtml(title)}</div>
          <div class="post-item-excerpt">${escapeHtml(excerpt)}</div>
          <div class="post-item-date">${formatDate(post.date)}${post.status === 'publish' ? ' · 公開済' : ''}</div>
        </div>
        <button class="post-item-more" type="button" title="操作">⋯</button>
      `

      /* テキスト部分クリック → 投稿を選択 */
      el.querySelector('.post-item-body').addEventListener('click', () => selectPost(post.id))

      /* ⋯ボタン → メニュー表示（スマホ対応） */
      el.querySelector('.post-item-more').addEventListener('click', (e) => {
        e.stopPropagation()
        showPostContextMenu(e, post)
      })

      /* 右クリック → メニュー（デスクトップ） */
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        showPostContextMenu(e, post)
      })

      dom.postList.appendChild(el)
    })
  }

  /* ============================================
   * 投稿操作
   * ============================================ */
  async function selectPost(id) {
    /* 未保存の変更を先に保存 */
    if (state.dirty && state.currentPostId) {
      await savePost()
    }

    state.currentPostId = id
    const post = state.posts.find((p) => p.id === id)

    if (post) {
      dom.titleInput.value = post.title || ''
      dom.editor.value = post.content || ''
      dom.dateLabel.textContent = formatDate(post.date)
      updateStatus(post.status)
    }

    renderPosts()
    state.dirty = false

    /* モバイル: サイドバーを閉じてエディタに集中 */
    if (window.innerWidth <= 768) {
      closeSidebarMobile()
    }
  }

  function newPost() {
    const now = new Date()
    const dateStr = formatDate(now)

    state.currentPostId = null
    dom.titleInput.value = ''
    dom.editor.value = ''
    dom.dateLabel.textContent = dateStr
    updateStatus('draft')
    state.dirty = false

    dom.editor.focus()
    renderPosts()
  }

  function onEditorInput() {
    state.dirty = true
    updateStatus('draft')

    /* 自動保存デバウンス */
    clearTimeout(state.autosaveTimer)
    state.autosaveTimer = setTimeout(() => {
      savePost()
    }, AUTOSAVE_DELAY)
  }

  async function savePost() {
    if (state.saving) return
    state.saving = true
    showSaveIndicator('保存中...', 'saving')

    const payload = {
      title: dom.titleInput.value.trim(),
      content: dom.editor.value,
      status: 'draft',
      folder: state.currentFolderId || 0,
    }

    try {
      let res
      if (state.currentPostId) {
        /* 更新 */
        res = await fetch(`${API}/posts.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: state.currentPostId, ...payload }),
        })
      } else {
        /* 新規作成 */
        res = await fetch(`${API}/posts.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (data.ok) {
        if (!state.currentPostId && data.id) {
          state.currentPostId = data.id
        }
        state.dirty = false
        showSaveIndicator('保存済み')
        await loadPosts()
        renderPosts()
      } else {
        showSaveIndicator('保存エラー', 'error')
      }
    } catch (e) {
      console.error('保存エラー:', e)
      showSaveIndicator('保存エラー', 'error')
    } finally {
      state.saving = false
    }
  }

  async function publishPost() {
    if (!dom.editor.value.trim()) {
      alert('内容を入力してください')
      return
    }

    state.saving = true
    showSaveIndicator('公開中...', 'saving')

    const payload = {
      title: dom.titleInput.value.trim(),
      content: dom.editor.value,
      status: 'publish',
      folder: state.currentFolderId || 0,
    }

    try {
      let res
      if (state.currentPostId) {
        res = await fetch(`${API}/posts.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: state.currentPostId, ...payload }),
        })
      } else {
        res = await fetch(`${API}/posts.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (data.ok) {
        if (!state.currentPostId && data.id) {
          state.currentPostId = data.id
        }
        state.dirty = false
        updateStatus('publish')
        showSaveIndicator('公開しました')
        await loadPosts()
        renderPosts()
      } else {
        showSaveIndicator('公開エラー', 'error')
        alert(data.error || '公開に失敗しました')
      }
    } catch (e) {
      showSaveIndicator('公開エラー', 'error')
      alert('通信エラーが発生しました')
    } finally {
      state.saving = false
    }
  }

  /* ============================================
   * タブ切替
   * ============================================ */
  function switchTab(tab) {
    dom.tabs.forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tab)
    })

    if (tab === 'write') {
      dom.editorScroll.style.display = ''
      dom.preview.style.display = 'none'
      dom.toolbar.style.display = ''
    } else {
      dom.editorScroll.style.display = 'none'
      dom.preview.style.display = ''
      dom.toolbar.style.display = 'none'
      renderPreview()
    }

  }

  /* ============================================
   * マークダウンプレビュー（軽量パーサー）
   * ============================================ */
  function renderPreview() {
    const md = dom.editor.value
    dom.preview.innerHTML = parseMarkdown(md)
  }

  function parseMarkdown(text) {
    let html = escapeHtml(text)

    /* コードブロック */
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

    /* 見出し */
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

    /* 太字・イタリック */
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/_(.+?)_/g, '<em>$1</em>')

    /* インラインコード */
    html = html.replace(/`(.+?)`/g, '<code>$1</code>')

    /* ウィキリンク [[テキスト]] */
    html = html.replace(/\[\[(.+?)\]\]/g, '<a href="#" class="wiki-link" data-link="$1">$1</a>')

    /* リンク */
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')

    /* 画像 */
    html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')

    /* 引用 */
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

    /* 水平線 */
    html = html.replace(/^---$/gm, '<hr>')

    /* リスト */
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

    /* 段落 */
    html = html.replace(/\n\n/g, '</p><p>')
    html = '<p>' + html + '</p>'
    html = html.replace(/<p><\/p>/g, '')

    return html
  }

  /* ============================================
   * マークダウンツールバー
   * ============================================ */
  function insertMarkdown(syntax) {
    const textarea = dom.editor
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)

    let insert = ''
    let cursorOffset = 0

    switch (syntax) {
      case '#':
        /* 行頭に # を追加（トグル） */
        const lineStart = text.lastIndexOf('\n', start - 1) + 1
        const lineEnd = text.indexOf('\n', start)
        const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd)
        if (line.startsWith('### ')) {
          /* h3 → 解除 */
          textarea.value = text.substring(0, lineStart) + line.substring(4) + text.substring(lineEnd === -1 ? text.length : lineEnd)
        } else if (line.startsWith('## ')) {
          /* h2 → h3 */
          textarea.value = text.substring(0, lineStart) + '#' + line + text.substring(lineEnd === -1 ? text.length : lineEnd)
        } else if (line.startsWith('# ')) {
          /* h1 → h2 */
          textarea.value = text.substring(0, lineStart) + '#' + line + text.substring(lineEnd === -1 ? text.length : lineEnd)
        } else {
          /* なし → h1 */
          textarea.value = text.substring(0, lineStart) + '# ' + line + text.substring(lineEnd === -1 ? text.length : lineEnd)
        }
        onEditorInput()
        return

      case '**':
        insert = `**${selected || 'テキスト'}**`
        cursorOffset = selected ? insert.length : 2
        break

      case '_':
        insert = `_${selected || 'テキスト'}_`
        cursorOffset = selected ? insert.length : 1
        break

      case '- ':
        insert = `\n- ${selected || ''}`
        cursorOffset = insert.length
        break

      case '+':
        insert = `\n1. ${selected || ''}`
        cursorOffset = insert.length
        break

      case '```':
        insert = `\n\`\`\`\n${selected || ''}\n\`\`\`\n`
        cursorOffset = selected ? insert.length : 5
        break

      /* []( は btn-link に移行済み */

      case '> ':
        insert = `\n> ${selected || ''}`
        cursorOffset = insert.length
        break

      case '!':
        insert = `![${selected || '画像'}](url)`
        cursorOffset = selected ? insert.length - 1 : 2
        break

      case '---':
        insert = '\n---\n'
        cursorOffset = insert.length
        break

      default:
        insert = syntax
        cursorOffset = syntax.length
    }

    textarea.value = text.substring(0, start) + insert + text.substring(end)
    textarea.selectionStart = textarea.selectionEnd = start + cursorOffset
    textarea.focus()
    onEditorInput()
  }

  /* ============================================
   * ウィキリンク [[テキスト]]
   * ============================================ */
  function insertWikiLink() {
    const textarea = dom.editor
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)

    const linkText = selected || ''
    const insert = `[[${linkText}]]`

    textarea.value = text.substring(0, start) + insert + text.substring(end)

    if (selected) {
      /* 選択テキストがあればカーソルを末尾に */
      textarea.selectionStart = textarea.selectionEnd = start + insert.length
    } else {
      /* なければ [[ と ]] の間にカーソル */
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }

    textarea.focus()
    onEditorInput()
  }

  /* ============================================
   * 画像アップロード
   * ============================================ */
  async function onFileSelect(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    for (const file of files) {
      await uploadImage(file)
    }

    /* リセット */
    dom.fileInput.value = ''
  }

  async function uploadImage(file) {
    const textarea = dom.editor
    const pos = textarea.selectionStart

    /* プレースホルダー挿入 */
    const placeholder = `\n![アップロード中...](uploading)\n`
    const before = textarea.value.substring(0, pos)
    const after = textarea.value.substring(pos)
    textarea.value = before + placeholder + after
    onEditorInput()

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch(`${API}/upload.php`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.ok) {
        /* プレースホルダーを実際の画像に置換 */
        textarea.value = textarea.value.replace(
          placeholder,
          `\n![${data.filename || '画像'}](${data.url})\n`
        )
        onEditorInput()
      } else {
        textarea.value = textarea.value.replace(placeholder, '')
        alert(data.error || '画像アップロードに失敗しました')
      }
    } catch (e) {
      textarea.value = textarea.value.replace(placeholder, '')
      alert('画像アップロード中にエラーが発生しました')
    }
  }

  /* ============================================
   * タイプライターモード
   * ============================================ */
  function typewriterScroll() {
    if (!state.typewriter) return

    const textarea = dom.editor
    const scrollContainer = dom.editorScroll
    const mirror = document.getElementById('typewriter-mirror')
    if (!mirror) return

    /* ミラーにテキストエリアと同じスタイルを適用 */
    const cs = getComputedStyle(textarea)
    mirror.style.fontFamily = cs.fontFamily
    mirror.style.fontSize = cs.fontSize
    mirror.style.lineHeight = cs.lineHeight
    mirror.style.letterSpacing = cs.letterSpacing
    mirror.style.padding = cs.padding
    mirror.style.width = textarea.offsetWidth + 'px'

    /* カーソルまでのテキストをミラーに入れて高さを計測 */
    const textBefore = textarea.value.substring(0, textarea.selectionEnd)
    mirror.textContent = textBefore

    /* 末尾の改行を反映するためにダミー文字を追加 */
    if (textBefore.endsWith('\n') || textBefore === '') {
      mirror.textContent += '\u200b'
    }

    const cursorY = mirror.scrollHeight

    /* スクロール: カーソル行が画面の縦中央に来るように */
    const containerHeight = scrollContainer.clientHeight
    const targetScroll = cursorY - containerHeight / 2

    scrollContainer.scrollTop = Math.max(0, targetScroll)
  }

  /* ============================================
   * キーボードショートカット
   * ============================================ */
  function onKeyDown(e) {
    /* Cmd/Ctrl + S: 保存 */
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      savePost()
    }

    /* Cmd/Ctrl + Enter: 公開 */
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      publishPost()
    }

    /* Cmd/Ctrl + N: 新規 */
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      newPost()
    }

    /* Tab: エディタ内でインデント */
    if (e.key === 'Tab' && document.activeElement === dom.editor) {
      e.preventDefault()
      const start = dom.editor.selectionStart
      const end = dom.editor.selectionEnd
      dom.editor.value =
        dom.editor.value.substring(0, start) +
        '  ' +
        dom.editor.value.substring(end)
      dom.editor.selectionStart = dom.editor.selectionEnd = start + 2
      onEditorInput()
    }
  }

  /* ============================================
   * コンテキストメニュー
   * ============================================ */
  function createContextMenu() {
    const menu = document.createElement('div')
    menu.className = 'context-menu'
    menu.id = 'context-menu'
    document.body.appendChild(menu)

    /* クリックで閉じる */
    document.addEventListener('click', () => {
      menu.classList.remove('show')
    })
  }

  function showFolderContextMenu(e, folder) {
    const menu = $('#context-menu')
    menu.innerHTML = `
      <button class="context-menu-item" data-action="add-sub">サブフォルダを追加</button>
      <button class="context-menu-item" data-action="move">移動</button>
      <button class="context-menu-item" data-action="rename">名前を変更</button>
      <div class="context-menu-sep"></div>
      <button class="context-menu-item danger" data-action="delete">削除</button>
    `

    positionContextMenu(menu, e.clientX, e.clientY)
    menu.classList.add('show')

    menu.querySelector('[data-action="add-sub"]').onclick = () => {
      promptNewFolder(folder.id)
    }

    menu.querySelector('[data-action="move"]').onclick = () => {
      moveFolder(folder.id)
    }

    menu.querySelector('[data-action="rename"]').onclick = async () => {
      const newName = await showModal('フォルダ名を変更', 'フォルダ名', folder.name)
      if (!newName || newName === folder.name) return
      try {
        const res = await fetch(`${API}/folders.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rename', id: folder.id, name: newName }),
        })
        const data = await res.json()
        if (data.ok) await loadFolders()
      } catch (err) {
        alert('通信エラー')
      }
    }

    menu.querySelector('[data-action="delete"]').onclick = async () => {
      if (!confirm(`「${folder.name}」を削除しますか？\n中の投稿は「すべて」に移動します。`)) return
      try {
        const res = await fetch(`${API}/folders.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: folder.id }),
        })
        const data = await res.json()
        if (data.ok) {
          state.currentFolderId = 0
          await loadFolders()
          await loadPosts()
        }
      } catch (err) {
        alert('通信エラー')
      }
    }
  }

  /* ============================================
   * モーダル
   * ============================================ */
  function createModal() {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.id = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-title" id="modal-title"></div>
        <input class="modal-input" id="modal-input" type="text">
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" id="modal-cancel">キャンセル</button>
          <button class="modal-btn modal-btn-primary" id="modal-ok">OK</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
  }

  function showModal(title, placeholder, defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = $('#modal-overlay')
      const input = $('#modal-input')
      const titleEl = $('#modal-title')

      titleEl.textContent = title
      input.placeholder = placeholder || ''
      input.value = defaultValue
      overlay.classList.add('show')
      input.focus()

      const cleanup = () => {
        overlay.classList.remove('show')
        $('#modal-ok').onclick = null
        $('#modal-cancel').onclick = null
        input.onkeydown = null
      }

      $('#modal-ok').onclick = () => {
        cleanup()
        resolve(input.value.trim() || null)
      }

      $('#modal-cancel').onclick = () => {
        cleanup()
        resolve(null)
      }

      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          cleanup()
          resolve(input.value.trim() || null)
        }
        if (e.key === 'Escape') {
          cleanup()
          resolve(null)
        }
      }
    })
  }

  /* ============================================
   * フォルダピッカー（移動先選択モーダル）
   * ============================================ */
  function createFolderPicker() {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.id = 'folder-picker-overlay'
    overlay.innerHTML = `
      <div class="modal-box folder-picker-box">
        <div class="modal-title" id="folder-picker-title">移動先を選択</div>
        <div class="folder-picker-list" id="folder-picker-list"></div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" id="folder-picker-cancel">キャンセル</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
  }

  /**
   * フォルダ選択モーダルを表示
   * @param {string} title - モーダルタイトル
   * @param {number[]} excludeIds - 除外するフォルダID
   * @param {number} currentId - 現在のフォルダID（ハイライト用）
   * @returns {Promise<number|null>} 選択されたフォルダID（0=ルート, null=キャンセル）
   */
  function showFolderPicker(title, excludeIds = [], currentId = -1) {
    return new Promise((resolve) => {
      const overlay = $('#folder-picker-overlay')
      const titleEl = $('#folder-picker-title')
      const list = $('#folder-picker-list')

      titleEl.textContent = title
      list.innerHTML = ''

      function cleanup() {
        overlay.classList.remove('show')
        $('#folder-picker-cancel').onclick = null
      }

      /* 「すべて」= ルートレベル（フォルダなし） */
      const allItem = document.createElement('div')
      allItem.className = 'folder-picker-item' + (currentId === 0 ? ' current' : '')
      allItem.textContent = '📁 すべて（フォルダなし）'
      allItem.addEventListener('click', () => { cleanup(); resolve(0) })
      list.appendChild(allItem)

      /* フォルダツリーを描画 */
      const filteredFolders = state.folders.filter((f) => !excludeIds.includes(f.id))
      const tree = buildFolderTree(filteredFolders)
      tree.forEach((folder) => renderPickerNode(folder, 0, list, excludeIds, currentId, resolve, cleanup))

      overlay.classList.add('show')

      $('#folder-picker-cancel').onclick = () => { cleanup(); resolve(null) }
    })
  }

  function renderPickerNode(folder, level, container, excludeIds, currentId, resolve, cleanup) {
    if (excludeIds.includes(folder.id)) return

    const el = document.createElement('div')
    el.className = 'folder-picker-item' + (folder.id === currentId ? ' current' : '')
    el.style.paddingLeft = (24 + level * 20) + 'px'
    el.textContent = '📁 ' + folder.name
    el.addEventListener('click', () => { cleanup(); resolve(folder.id) })
    container.appendChild(el)

    if (folder.children) {
      folder.children.forEach((child) => renderPickerNode(child, level + 1, container, excludeIds, currentId, resolve, cleanup))
    }
  }

  /* ============================================
   * 投稿の削除
   * ============================================ */
  async function deletePost(id) {
    const post = state.posts.find((p) => p.id === id)
    const name = post?.title || formatDate(post?.date) || '無題'
    if (!confirm(`「${name}」を削除しますか？\nゴミ箱に移動します。`)) return

    try {
      const res = await fetch(`${API}/posts.php?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        showSaveIndicator('削除しました')
        /* 現在編集中の投稿を削除した場合 */
        if (state.currentPostId === id) {
          state.currentPostId = null
          dom.titleInput.value = ''
          dom.editor.value = ''
        }
        await loadPosts()
        await loadFolders() /* カウント更新 */
        /* 次の投稿を選択 */
        if (state.posts.length > 0) {
          selectPost(state.posts[0].id)
        } else {
          newPost()
        }
      } else {
        alert(data.error || '削除に失敗しました')
      }
    } catch (e) {
      alert('通信エラーが発生しました')
    }
  }

  /* ============================================
   * 投稿の移動（フォルダ間）
   * ============================================ */
  async function movePost(id) {
    /* 現在のフォルダを特定 */
    const post = state.posts.find((p) => p.id === id)
    const currentFolder = post?.categories?.find((c) => c !== 52) || 0 /* 52 = Garden親 */

    const folderId = await showFolderPicker('移動先フォルダを選択', [], currentFolder)
    if (folderId === null) return

    try {
      const res = await fetch(`${API}/posts.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, folder: folderId }),
      })
      const data = await res.json()
      if (data.ok) {
        showSaveIndicator('移動しました')
        await loadPosts()
        await loadFolders() /* カウント更新 */
      } else {
        alert(data.error || '移動に失敗しました')
      }
    } catch (e) {
      alert('通信エラーが発生しました')
    }
  }

  /* ============================================
   * フォルダの移動（親フォルダ変更）
   * ============================================ */
  async function moveFolder(folderId) {
    /* 自分自身と子孫を除外（循環参照防止） */
    const excludeIds = [folderId, ...getDescendantIds(folderId)]

    /* 現在の親を特定 */
    const folder = state.folders.find((f) => f.id === folderId)
    const currentParent = folder?.parent || 0

    const newParent = await showFolderPicker('移動先の親フォルダを選択', excludeIds, currentParent)
    if (newParent === null) return

    try {
      const res = await fetch(`${API}/folders.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', id: folderId, parent: newParent }),
      })
      const data = await res.json()
      if (data.ok) {
        showSaveIndicator('フォルダを移動しました')
        /* 移動先の親を展開 */
        if (newParent > 0) {
          if (!state.expandedFolders) state.expandedFolders = new Set()
          state.expandedFolders.add(newParent)
        }
        await loadFolders()
      } else {
        alert(data.error || 'フォルダの移動に失敗しました')
      }
    } catch (e) {
      alert('通信エラーが発生しました')
    }
  }

  /**
   * 指定フォルダの子孫IDを全て取得（再帰）
   */
  function getDescendantIds(folderId) {
    const ids = []
    state.folders.forEach((f) => {
      if (f.parent === folderId) {
        ids.push(f.id)
        ids.push(...getDescendantIds(f.id))
      }
    })
    return ids
  }

  /* ============================================
   * 投稿コンテキストメニュー
   * ============================================ */
  function showPostContextMenu(e, post) {
    const menu = $('#context-menu')
    menu.innerHTML = `
      <button class="context-menu-item" data-action="move">フォルダに移動</button>
      <div class="context-menu-sep"></div>
      <button class="context-menu-item danger" data-action="delete">削除</button>
    `

    positionContextMenu(menu, e.clientX, e.clientY)
    menu.classList.add('show')

    menu.querySelector('[data-action="move"]').onclick = () => movePost(post.id)
    menu.querySelector('[data-action="delete"]').onclick = () => deletePost(post.id)
  }

  /**
   * コンテキストメニューの位置を画面内に収める
   */
  function positionContextMenu(menu, x, y) {
    menu.style.left = x + 'px'
    menu.style.top = y + 'px'
    menu.classList.add('show')

    /* 画面外にはみ出す場合は調整 */
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        menu.style.left = (window.innerWidth - rect.width - 8) + 'px'
      }
      if (rect.bottom > window.innerHeight) {
        menu.style.top = (window.innerHeight - rect.height - 8) + 'px'
      }
    })
  }

  /* ============================================
   * UI ヘルパー
   * ============================================ */
  function updateStatus(status) {
    const label = dom.statusLabel
    if (status === 'publish') {
      label.textContent = '公開済み'
      label.classList.add('published')
    } else {
      label.textContent = '下書き'
      label.classList.remove('published')
    }
  }

  function showSaveIndicator(text, cls = '') {
    const el = $('#save-indicator')
    el.textContent = text
    el.className = 'save-indicator show ' + cls

    clearTimeout(el._timer)
    el._timer = setTimeout(() => {
      el.classList.remove('show')
    }, 2000)
  }

  function formatDate(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  function logout() {
    if (confirm('ログアウトしますか？')) {
      fetch(`${API}/auth.php?action=logout`).then(() => {
        location.reload()
      })
    }
  }

  /* ============================================
   * 起動
   * ============================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()

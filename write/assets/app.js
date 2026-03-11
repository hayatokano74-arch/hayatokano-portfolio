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
  const API = 'api'
  const AUTOSAVE_DELAY = 3000
  const TYPEWRITER_MODE = true

  /* CSRFトークン（metaタグから取得） */
  const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content || ''

  const state = {
    posts: [],
    folders: [],
    currentPostId: null,
    currentFolderId: null,
    dirty: false,
    saving: false,
    autosaveTimer: null,
    typewriter: TYPEWRITER_MODE,
    sidebarView: 'folders', /* 'folders' | 'posts' */
    searchQuery: '',        /* サイドバー検索クエリ */
  }

  /* ============================================
   * CSRF付きfetchラッパー
   * ============================================ */
  function apiFetch(url, options = {}) {
    const headers = options.headers || {}
    /* CSRFトークンを非GETリクエストに付与 */
    const method = (options.method || 'GET').toUpperCase()
    if (method !== 'GET' && CSRF_TOKEN) {
      headers['X-CSRF-Token'] = CSRF_TOKEN
    }
    /* Content-Typeが未指定でbodyがFormDataでない場合 */
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
    return fetch(url, { ...options, headers })
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
    btnSettings: $('#btn-settings'),
    btnSidebarToggle: $('#btn-sidebar-toggle'),
    btnMobileBack: $('#btn-mobile-back'),
    btnPhoto: $('#btn-photo'),
    btnFullscreen: $('#btn-fullscreen'),
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

    /* 保存インジケーター追加 */
    const indicator = document.createElement('div')
    indicator.className = 'save-indicator'
    indicator.id = 'save-indicator'
    document.body.appendChild(indicator)

    /* 文字数カウンター追加 */
    const counter = document.createElement('span')
    counter.className = 'char-counter'
    counter.id = 'char-counter'
    counter.textContent = '0 字'
    dom.toolbar.insertBefore(counter, dom.toolbar.querySelector('.toolbar-spacer'))

    /* サイドバーバックドロップ（モバイル用） */
    const backdrop = document.createElement('div')
    backdrop.className = 'sidebar-backdrop'
    backdrop.id = 'sidebar-backdrop'
    document.body.appendChild(backdrop)
    backdrop.addEventListener('click', toggleSidebar)

    /* 設定ポップオーバー */
    createSettingsPopover()

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

    /* 前回開いていたフォルダを復元 */
    const savedFolder = parseInt(localStorage.getItem('garden-folder'), 10)
    const restoreFolder = (!isNaN(savedFolder) && savedFolder >= 0) ? savedFolder : 0

    /* 初期状態: フォルダビュー */
    dom.sidebar.classList.add('view-folders')

    /* モバイル: サイドバーを表示（前回のフォルダがあればそこに入る） */
    if (window.innerWidth <= 768) {
      dom.sidebar.classList.remove('hidden')
      if (restoreFolder > 0) {
        enterFolder(restoreFolder)
      }
    }

    /* 前回のフォルダに入って最新の投稿を選択 */
    if (window.innerWidth > 768) {
      enterFolder(restoreFolder)
      if (state.posts.length > 0) {
        selectPost(state.posts[0].id)
      } else {
        newPost()
      }
    }
  }

  /* ============================================
   * イベント
   * ============================================ */
  function bindEvents() {
    /* 新規投稿 */
    dom.btnNew.addEventListener('click', () => {
      /* フォルダビューにいる場合は「すべて」に入る */
      if (state.sidebarView === 'folders') {
        enterFolder(0)
      }
      newPost()
    })

    /* 公開 */
    dom.btnPublish.addEventListener('click', publishPost)

    /* テーマ切替 */
    dom.btnTheme.addEventListener('click', toggleTheme)

    /* 設定ポップオーバー */
    dom.btnSettings.addEventListener('click', toggleSettings)
    initEditorSettings()

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

    /* 全画面ボタン */
    if (dom.btnFullscreen) {
      dom.btnFullscreen.addEventListener('click', toggleFullscreen)
    }

    /* Fullscreen API: ブラウザ側の全画面変更を検知 */
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('webkitfullscreenchange', onFullscreenChange)

    /* タイプライターモード: カーソル位置をスクロール */
    dom.editor.addEventListener('input', typewriterScroll)
    dom.editor.addEventListener('keyup', typewriterScroll)
    dom.editor.addEventListener('click', typewriterScroll)

    /* キーボードショートカット */
    document.addEventListener('keydown', onKeyDown)

    /* 未保存変更の離脱警告 */
    window.addEventListener('beforeunload', (e) => {
      if (state.dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    })

    /* クリップボードから画像ペースト */
    dom.editor.addEventListener('paste', onPasteImage)

    /* サイドバー検索 */
    const searchInput = $('#search-input')
    const searchClear = $('#search-clear')
    let searchDebounce = null
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce)
        searchDebounce = setTimeout(() => {
          state.searchQuery = searchInput.value.trim().toLowerCase()
          searchClear.style.display = state.searchQuery ? '' : 'none'
          renderPosts()
        }, 300)
      })
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = ''
        state.searchQuery = ''
        searchClear.style.display = 'none'
        renderPosts()
        searchInput.focus()
      })
    }
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
   * 設定ポップオーバー
   * ============================================ */
  const FONT_SIZE_MIN = 12
  const FONT_SIZE_MAX = 24
  const FONT_SIZE_STEP = 2
  const DEFAULT_FONT_SIZE = 16

  const LINE_WIDTH_MIN = 30
  const LINE_WIDTH_MAX = 100
  const LINE_WIDTH_STEP = 5
  const DEFAULT_LINE_WIDTH = 0 /* 0 = 全幅 */

  function createSettingsPopover() {
    const popover = document.createElement('div')
    popover.className = 'settings-popover'
    popover.id = 'settings-popover'
    popover.innerHTML = `
      <div class="settings-popover-title">設定</div>
      <div class="settings-group">
        <div class="settings-label">
          <span>文字サイズ</span>
          <span class="settings-value" id="settings-font-value">16px</span>
        </div>
        <input type="range" class="settings-slider" id="settings-font-slider"
          min="${FONT_SIZE_MIN}" max="${FONT_SIZE_MAX}" step="${FONT_SIZE_STEP}" value="${DEFAULT_FONT_SIZE}">
      </div>
      <div class="settings-group">
        <div class="settings-label">
          <span>行幅</span>
          <span class="settings-value" id="settings-width-value">全幅</span>
        </div>
        <input type="range" class="settings-slider" id="settings-width-slider"
          min="${LINE_WIDTH_MIN}" max="${LINE_WIDTH_MAX}" step="${LINE_WIDTH_STEP}" value="${LINE_WIDTH_MAX}">
      </div>
      <div class="settings-group">
        <div class="settings-toggle" id="settings-typewriter-toggle">
          <span class="settings-toggle-label">タイプライターモード</span>
          <span class="settings-switch on" id="settings-typewriter-switch"></span>
        </div>
      </div>
      <div class="settings-group">
        <div class="settings-label">
          <span>並び順</span>
        </div>
        <select class="settings-select" id="settings-sort">
          <option value="modified-desc">更新日（新しい順）</option>
          <option value="modified-asc">更新日（古い順）</option>
          <option value="date-desc">作成日（新しい順）</option>
          <option value="date-asc">作成日（古い順）</option>
          <option value="title-asc">タイトル（A→Z）</option>
          <option value="title-desc">タイトル（Z→A）</option>
        </select>
      </div>
    `
    /* サイドバーフッターの相対位置に配置 */
    const sidebarFooter = document.querySelector('.sidebar-footer')
    sidebarFooter.style.position = 'relative'
    sidebarFooter.appendChild(popover)

    /* スライダーイベント */
    const fontSlider = popover.querySelector('#settings-font-slider')
    const widthSlider = popover.querySelector('#settings-width-slider')

    fontSlider.addEventListener('input', (e) => {
      const size = parseInt(e.target.value, 10)
      applyFontSize(size)
      saveSettingsToServer({ fontSize: size })
    })

    widthSlider.addEventListener('input', (e) => {
      const width = parseInt(e.target.value, 10)
      applyLineWidth(width)
      saveSettingsToServer({ lineWidth: width })
    })

    /* タイプライターモード切替 */
    const twToggle = popover.querySelector('#settings-typewriter-toggle')
    twToggle.addEventListener('click', () => {
      state.typewriter = !state.typewriter
      const sw = popover.querySelector('#settings-typewriter-switch')
      sw.classList.toggle('on', state.typewriter)
      applyTypewriterMode(state.typewriter)
      saveSettingsToServer({ typewriter: state.typewriter })
    })

    /* 並び順 */
    const sortSelect = popover.querySelector('#settings-sort')
    sortSelect.addEventListener('change', (e) => {
      saveSettingsToServer({ sort: e.target.value })
      loadPosts()
    })

    /* ポップオーバー内クリックは閉じない */
    popover.addEventListener('click', (e) => e.stopPropagation())
  }

  function toggleSettings(e) {
    e.stopPropagation()
    const popover = $('#settings-popover')
    const isOpen = popover.classList.contains('show')

    if (isOpen) {
      popover.classList.remove('show')
      document.removeEventListener('click', closeSettingsOnOutsideClick)
    } else {
      popover.classList.add('show')
      /* 外側クリックで閉じる */
      setTimeout(() => {
        document.addEventListener('click', closeSettingsOnOutsideClick)
      }, 0)
    }
  }

  function closeSettingsOnOutsideClick() {
    const popover = $('#settings-popover')
    popover.classList.remove('show')
    document.removeEventListener('click', closeSettingsOnOutsideClick)
  }

  /* 設定の保存デバウンスタイマー */
  let settingsSaveTimer = null

  /**
   * サーバーに設定を保存（デバウンス付き）
   */
  function saveSettingsToServer(partial) {
    clearTimeout(settingsSaveTimer)
    settingsSaveTimer = setTimeout(async () => {
      try {
        await apiFetch(`${API}/settings.php`, {
          method: 'PUT',
          body: JSON.stringify(partial),
        })
      } catch (e) {
        console.error('設定保存エラー:', e)
      }
    }, 500)
  }

  /**
   * サーバーから設定を読み込んで適用
   */
  async function initEditorSettings() {
    /* まずデフォルト値を適用（即座に表示） */
    applyFontSize(DEFAULT_FONT_SIZE)
    applyLineWidth(DEFAULT_LINE_WIDTH)

    /* サーバーから設定を取得 */
    try {
      const res = await apiFetch(`${API}/settings.php`)
      const data = await res.json()
      if (data.ok && data.settings) {
        const s = data.settings

        /* フォントサイズ */
        const size = (s.fontSize >= FONT_SIZE_MIN && s.fontSize <= FONT_SIZE_MAX) ? s.fontSize : DEFAULT_FONT_SIZE
        applyFontSize(size)
        const fontSlider = $('#settings-font-slider')
        if (fontSlider) fontSlider.value = size

        /* 行幅 */
        const width = (s.lineWidth >= LINE_WIDTH_MIN && s.lineWidth <= LINE_WIDTH_MAX) ? s.lineWidth : DEFAULT_LINE_WIDTH
        applyLineWidth(width)
        const widthSlider = $('#settings-width-slider')
        if (widthSlider) widthSlider.value = width || LINE_WIDTH_MAX

        /* タイプライターモード */
        state.typewriter = s.typewriter !== false
        const twSwitch = $('#settings-typewriter-switch')
        if (twSwitch) twSwitch.classList.toggle('on', state.typewriter)
        applyTypewriterMode(state.typewriter)

        /* 並び順 */
        const sortSelect = $('#settings-sort')
        if (sortSelect) sortSelect.value = s.sort || 'modified-desc'

        return
      }
    } catch (e) {
      console.error('設定読み込みエラー:', e)
    }

    /* サーバー取得に失敗した場合はデフォルト値のまま */
    const fontSlider = $('#settings-font-slider')
    const widthSlider = $('#settings-width-slider')
    if (fontSlider) fontSlider.value = DEFAULT_FONT_SIZE
    if (widthSlider) widthSlider.value = LINE_WIDTH_MAX
  }

  /**
   * タイプライターモードの適用/解除
   */
  function applyTypewriterMode(enabled) {
    if (enabled) {
      /* ミラーdivがなければ作成 */
      if (!document.getElementById('typewriter-mirror')) {
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
      /* 下部余白を追加（カーソルが最下行でも中央に来る） */
      dom.editor.style.paddingBottom = '50vh'
    } else {
      /* ミラーdivを削除 */
      const mirror = document.getElementById('typewriter-mirror')
      if (mirror) mirror.remove()
      /* 下部余白を通常に戻す */
      dom.editor.style.paddingBottom = '32px'
    }
  }

  function applyFontSize(size) {
    dom.editor.style.fontSize = size + 'px'
    const valueEl = $('#settings-font-value')
    if (valueEl) valueEl.textContent = size + 'px'
  }

  function applyLineWidth(width) {
    const content = $('#editor-content')
    /* 0 またはMAXは全幅 */
    if (!width || width >= LINE_WIDTH_MAX) {
      if (content) content.style.maxWidth = ''
      const valueEl = $('#settings-width-value')
      if (valueEl) valueEl.textContent = '全幅'
    } else {
      /* ch単位 + パディング分を加算（ラッパーで統一制御） */
      if (content) content.style.maxWidth = `calc(${width}ch + 96px)`
      const valueEl = $('#settings-width-value')
      if (valueEl) valueEl.textContent = width + '文字'
    }
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
   * サイドバー ドリルダウンナビ
   * ============================================ */

  /**
   * フォルダに入る（投稿ビューに切替）
   */
  function enterFolder(folderId) {
    state.currentFolderId = folderId
    state.sidebarView = 'posts'
    localStorage.setItem('garden-folder', folderId)

    /* サイドバーのビュー切替 */
    dom.sidebar.classList.remove('view-folders')
    dom.sidebar.classList.add('view-posts')

    /* ヘッダーを「‹ フォルダ名」に変更 */
    const folderName = folderId === 0
      ? 'すべて'
      : (state.folders.find((f) => f.id === folderId)?.name || '')
    const title = dom.sidebar.querySelector('.sidebar-title')
    title.textContent = '‹ ' + folderName
    title.classList.add('clickable')
    title.onclick = (e) => {
      e.stopPropagation()
      exitFolder()
    }

    /* 投稿を読み込み */
    loadPosts()
  }

  /**
   * フォルダビューに戻る
   */
  function exitFolder() {
    state.sidebarView = 'folders'

    /* サイドバーのビュー切替 */
    dom.sidebar.classList.remove('view-posts')
    dom.sidebar.classList.add('view-folders')

    /* ヘッダーを「Garden」に戻す */
    const title = dom.sidebar.querySelector('.sidebar-title')
    title.textContent = 'Garden'
    title.classList.remove('clickable')
    title.onclick = null
  }

  /* ============================================
   * フォルダ
   * ============================================ */
  async function loadFolders() {
    try {
      const res = await apiFetch(`${API}/folders.php`)
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

      /* フォルダツリーは常に展開 */

      folder.children.forEach((child) => renderFolderNode(child, level + 1, childContainer))
      container.appendChild(childContainer)
    }
  }

  function createFolderItem(folder, level = 0, hasChildren = false) {
    const el = document.createElement('div')
    el.className = `folder-item folder-level-${Math.min(level, 3)}`
    el.dataset.folderId = folder.id

    const toggleHtml = hasChildren
      ? '<span class="folder-toggle expanded">▶</span>'
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

    /* 展開トグル（▶）クリック → 子フォルダの展開/折畳のみ */
    const toggle = el.querySelector('.folder-toggle')
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleFolderExpanded(folder.id)
      })
    }

    /* フォルダ行クリック → ドリルダウン（投稿ビューに切替） */
    el.addEventListener('click', () => {
      enterFolder(folder.id)
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

      const res = await apiFetch(`${API}/folders.php`, {
        method: 'POST',
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

      /* 並び順を適用（設定ポップオーバーの現在値を使用） */
      const sortSelect = $('#settings-sort')
      const sortPref = sortSelect ? sortSelect.value : 'modified-desc'
      const [orderby, order] = sortPref.split('-')
      params.set('orderby', orderby)
      params.set('order', order)

      const res = await apiFetch(`${API}/posts.php?${params}`)
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

    /* 検索フィルタ */
    let filteredPosts = state.posts
    if (state.searchQuery) {
      const q = state.searchQuery
      filteredPosts = state.posts.filter((post) => {
        const title = (post.title || '').toLowerCase()
        const content = (post.content || '').substring(0, 500).toLowerCase()
        return title.includes(q) || content.includes(q)
      })
    }

    if (filteredPosts.length === 0) {
      const msg = state.searchQuery ? '一致する投稿がありません' : '投稿がありません'
      dom.postList.innerHTML = `<div style="padding:16px;color:var(--muted);font-size:13px;">${msg}</div>`
      return
    }

    filteredPosts.forEach((post) => {
      const el = document.createElement('div')
      el.className = 'post-item' + (post.id === state.currentPostId ? ' active' : '')
      el.dataset.postId = post.id
      el.setAttribute('role', 'option')
      el.setAttribute('aria-selected', post.id === state.currentPostId ? 'true' : 'false')
      el.setAttribute('tabindex', '0')

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

      /* キーボード: Enter で選択、↑↓で移動 */
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          selectPost(post.id)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          const next = el.nextElementSibling
          if (next && next.classList.contains('post-item')) next.focus()
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          const prev = el.previousElementSibling
          if (prev && prev.classList.contains('post-item')) prev.focus()
        }
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

    /* 文字数カウンター更新 */
    requestAnimationFrame(updateCharCount)

    /* 自動保存デバウンス */
    clearTimeout(state.autosaveTimer)
    state.autosaveTimer = setTimeout(() => {
      savePost()
    }, AUTOSAVE_DELAY)
  }

  /**
   * 文字数カウント（Markdownシンタックスを除外した本文文字数）
   */
  function updateCharCount() {
    const text = dom.editor.value
    /* Markdown記号・空行を除去してカウント */
    const plain = text
      .replace(/```[\s\S]*?```/g, '')         /* コードブロック */
      .replace(/^#{1,3}\s/gm, '')             /* 見出し記号 */
      .replace(/\*\*|__|~~|==|`/g, '')        /* 装飾記号 */
      .replace(/!\[.*?\]\(.*?\)/g, '')        /* 画像 */
      .replace(/\[(.+?)\]\(.*?\)/g, '$1')    /* リンク（テキストのみ残す） */
      .replace(/^[\s>-]+/gm, '')              /* 引用・リスト記号 */
      .replace(/\s+/g, '')                    /* 空白除去 */
    const count = plain.length
    const counter = $('#char-counter')
    if (counter) counter.textContent = count.toLocaleString() + ' 字'
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
        res = await apiFetch(`${API}/posts.php`, {
          method: 'PUT',
          body: JSON.stringify({ id: state.currentPostId, ...payload }),
        })
      } else {
        /* 新規作成 */
        res = await apiFetch(`${API}/posts.php`, {
          method: 'POST',
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
        res = await apiFetch(`${API}/posts.php`, {
          method: 'PUT',
          body: JSON.stringify({ id: state.currentPostId, ...payload }),
        })
      } else {
        res = await apiFetch(`${API}/posts.php`, {
          method: 'POST',
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
    const html = parseMarkdown(md)
    /* DOMPurify でXSSサニタイズ */
    dom.preview.innerHTML = typeof DOMPurify !== 'undefined'
      ? DOMPurify.sanitize(html, { ADD_ATTR: ['data-link'] })
      : html
  }

  /**
   * 軽量マークダウンパーサー
   * テーブル・チェックリスト・ハイライト対応
   */
  function parseMarkdown(text) {
    let html = escapeHtml(text)

    /* コードブロック */
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')

    /* テーブル */
    html = parseMarkdownTables(html)

    /* 見出し */
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

    /* 太字・イタリック */
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/_(.+?)_/g, '<em>$1</em>')

    /* ハイライト ==テキスト== */
    html = html.replace(/==(.+?)==/g, '<mark>$1</mark>')

    /* インラインコード */
    html = html.replace(/`(.+?)`/g, '<code>$1</code>')

    /* ウィキリンク [[テキスト]] */
    html = html.replace(/\[\[(.+?)\]\]/g, '<a href="#" class="wiki-link" data-link="$1">$1</a>')

    /* リンク（javascript: スキーム除去） */
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_, label, href) => {
      if (/^\s*javascript:/i.test(href)) return label
      return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
    })

    /* 画像 */
    html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')

    /* 引用 */
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

    /* 水平線 */
    html = html.replace(/^---$/gm, '<hr>')

    /* チェックリスト（リストより先にマッチ） */
    html = html.replace(/^- \[x\] (.+)$/gm, '<li class="checklist checked"><input type="checkbox" checked disabled> $1</li>')
    html = html.replace(/^- \[ \] (.+)$/gm, '<li class="checklist"><input type="checkbox" disabled> $1</li>')

    /* リスト */
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li[\s>].*<\/li>\n?)+/gs, '<ul>$&</ul>')

    /* 段落 */
    html = html.replace(/\n\n/g, '</p><p>')
    html = '<p>' + html + '</p>'
    html = html.replace(/<p><\/p>/g, '')

    return html
  }

  /**
   * マークダウンテーブルパーサー
   * | col1 | col2 | 記法を <table> に変換
   */
  function parseMarkdownTables(html) {
    return html.replace(/((?:^\|.+\|[ \t]*$\n?)+)/gm, (block) => {
      const rows = block.trim().split('\n').filter(r => r.trim())
      if (rows.length < 2) return block

      /* 2行目がセパレーター（|---|---| 形式）かチェック */
      const sepLine = rows[1].trim()
      if (!/^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(sepLine)) return block

      const parseCells = (row) =>
        row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())

      const headers = parseCells(rows[0])
      const bodyRows = rows.slice(2)

      let table = '<table><thead><tr>'
      headers.forEach(h => { table += `<th>${h}</th>` })
      table += '</tr></thead><tbody>'
      bodyRows.forEach(row => {
        const cells = parseCells(row)
        table += '<tr>'
        cells.forEach(c => { table += `<td>${c}</td>` })
        table += '</tr>'
      })
      table += '</tbody></table>'
      return table
    })
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

      const res = await apiFetch(`${API}/upload.php`, {
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
   * クリップボード画像ペースト
   * ============================================ */
  function onPasteImage(e) {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) uploadImage(file)
        return
      }
    }
  }

  /* ============================================
   * 全画面モード
   * ============================================ */
  function toggleFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement
    if (fsEl) {
      /* 全画面解除 */
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      }
    } else {
      /* 全画面開始 */
      const el = document.documentElement
      const request = el.requestFullscreen || el.webkitRequestFullscreen
      if (request) {
        request.call(el).catch(() => {
          /* Fullscreen API 非対応: CSSのみで切替 */
          document.getElementById('app').classList.toggle('fullscreen')
        })
      } else {
        document.getElementById('app').classList.toggle('fullscreen')
      }
    }
  }

  function onFullscreenChange() {
    const app = document.getElementById('app')
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement
    if (fsEl) {
      app.classList.add('fullscreen')
    } else {
      app.classList.remove('fullscreen')
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
    mirror.style.maxWidth = cs.maxWidth
    mirror.style.boxSizing = 'border-box'

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
    const clampedScroll = Math.max(0, targetScroll)

    /* 差が小さい場合はスキップ（ガタつき防止） */
    if (Math.abs(scrollContainer.scrollTop - clampedScroll) < 4) return

    scrollContainer.scrollTo({
      top: clampedScroll,
      behavior: 'smooth',
    })
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
    menu.setAttribute('role', 'menu')
    menu.setAttribute('aria-label', '操作メニュー')
    document.body.appendChild(menu)

    /* クリックで閉じる */
    document.addEventListener('click', () => {
      menu.classList.remove('show')
    })

    /* Escape で閉じる */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('show')) {
        menu.classList.remove('show')
        /* メニューを開いた要素にフォーカスを戻す */
        if (menu._trigger) {
          menu._trigger.focus()
          menu._trigger = null
        }
      }
    })
  }

  function showFolderContextMenu(e, folder) {
    const menu = $('#context-menu')
    menu._trigger = e.target
    menu.innerHTML = `
      <button class="context-menu-item" data-action="add-sub" role="menuitem">サブフォルダを追加</button>
      <button class="context-menu-item" data-action="move" role="menuitem">移動</button>
      <button class="context-menu-item" data-action="rename" role="menuitem">名前を変更</button>
      <div class="context-menu-sep" role="separator"></div>
      <button class="context-menu-item danger" data-action="delete" role="menuitem">削除</button>
    `

    positionContextMenu(menu, e.clientX, e.clientY)
    menu.classList.add('show')
    setupMenuKeyboardNav(menu)

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
        const res = await apiFetch(`${API}/folders.php`, {
          method: 'POST',
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
        const res = await apiFetch(`${API}/folders.php`, {
          method: 'POST',
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
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
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

  /**
   * フォーカストラップ: Tab/Shift+Tab でモーダル内を循環
   */
  function trapFocus(container, e) {
    const focusable = container.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }

  /* モーダル表示時にフォーカスを戻す元の要素 */
  let modalTrigger = null

  function showModal(title, placeholder, defaultValue = '') {
    return new Promise((resolve) => {
      modalTrigger = document.activeElement
      const overlay = $('#modal-overlay')
      const input = $('#modal-input')
      const titleEl = $('#modal-title')
      const box = overlay.querySelector('.modal-box')

      titleEl.textContent = title
      input.placeholder = placeholder || ''
      input.value = defaultValue
      overlay.classList.add('show')
      input.focus()

      const onTrap = (e) => trapFocus(box, e)
      document.addEventListener('keydown', onTrap)

      const cleanup = () => {
        overlay.classList.remove('show')
        document.removeEventListener('keydown', onTrap)
        $('#modal-ok').onclick = null
        $('#modal-cancel').onclick = null
        input.onkeydown = null
        /* 元のトリガー要素にフォーカス戻し */
        if (modalTrigger) {
          modalTrigger.focus()
          modalTrigger = null
        }
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
      <div class="modal-box folder-picker-box" role="dialog" aria-modal="true" aria-labelledby="folder-picker-title">
        <div class="modal-title" id="folder-picker-title">移動先を選択</div>
        <div class="folder-picker-list" id="folder-picker-list" role="listbox" aria-label="フォルダ一覧"></div>
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
      const pickerTrigger = document.activeElement
      const overlay = $('#folder-picker-overlay')
      const titleEl = $('#folder-picker-title')
      const list = $('#folder-picker-list')
      const box = overlay.querySelector('.modal-box')

      titleEl.textContent = title
      list.innerHTML = ''

      const onTrap = (e) => {
        trapFocus(box, e)
        if (e.key === 'Escape') { cleanup(); resolve(null) }
      }
      document.addEventListener('keydown', onTrap)

      function cleanup() {
        overlay.classList.remove('show')
        document.removeEventListener('keydown', onTrap)
        $('#folder-picker-cancel').onclick = null
        if (pickerTrigger) pickerTrigger.focus()
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
      const res = await apiFetch(`${API}/posts.php?id=${id}`, { method: 'DELETE' })
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
      const res = await apiFetch(`${API}/posts.php`, {
        method: 'PUT',
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
      const res = await apiFetch(`${API}/folders.php`, {
        method: 'POST',
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
    menu._trigger = e.target
    menu.innerHTML = `
      <button class="context-menu-item" data-action="move" role="menuitem">フォルダに移動</button>
      <div class="context-menu-sep" role="separator"></div>
      <button class="context-menu-item danger" data-action="delete" role="menuitem">削除</button>
    `

    positionContextMenu(menu, e.clientX, e.clientY)
    menu.classList.add('show')
    setupMenuKeyboardNav(menu)

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

  /**
   * コンテキストメニューのキーボードナビゲーション
   * ↑/↓ で項目移動、Enter で実行
   */
  function setupMenuKeyboardNav(menu) {
    const items = menu.querySelectorAll('[role="menuitem"]')
    if (items.length === 0) return
    let idx = 0
    items[0].focus()

    function onMenuKey(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        idx = (idx + 1) % items.length
        items[idx].focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        idx = (idx - 1 + items.length) % items.length
        items[idx].focus()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        items[idx].click()
        menu.removeEventListener('keydown', onMenuKey)
      } else if (e.key === 'Escape') {
        menu.classList.remove('show')
        menu.removeEventListener('keydown', onMenuKey)
        if (menu._trigger) { menu._trigger.focus(); menu._trigger = null }
      }
    }
    menu.addEventListener('keydown', onMenuKey)
    /* メニューが閉じたらリスナー解除 */
    const observer = new MutationObserver(() => {
      if (!menu.classList.contains('show')) {
        menu.removeEventListener('keydown', onMenuKey)
        observer.disconnect()
      }
    })
    observer.observe(menu, { attributes: true, attributeFilter: ['class'] })
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
      apiFetch(`${API}/auth.php?action=logout`).then(() => {
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

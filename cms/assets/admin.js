/**
 * Hayato Kano CMS — 管理画面 JavaScript
 * Vanilla JS（依存ライブラリなし）
 */

/* ══════════════════════════════════════════════
   1. サイドバーのモバイル開閉
   ══════════════════════════════════════════════ */

const Sidebar = (() => {
  let sidebar, overlay, toggleBtn;

  function open() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  function toggle() {
    sidebar.classList.contains('is-open') ? close() : open();
  }

  function init() {
    sidebar   = document.querySelector('.sidebar');
    overlay   = document.querySelector('.sidebar-overlay');
    toggleBtn = document.querySelector('.topbar__menu-toggle');

    if (!sidebar) return;

    // トグルボタン
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // オーバーレイクリックで閉じる
    if (overlay) {
      overlay.addEventListener('click', close);
    }

    // Esc キーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    // ウィンドウリサイズ時にデスクトップなら強制クローズ
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) close();
    });
  }

  return { init, open, close, toggle };
})();


/* ══════════════════════════════════════════════
   2. トースト通知
   ══════════════════════════════════════════════ */

const Toast = (() => {
  let container;

  /**
   * トーストを表示する
   * @param {string} message  - メッセージ本文
   * @param {string} type     - 'success' | 'error' | 'warning' | 'info'
   * @param {string} [title]  - タイトル（省略可）
   * @param {number} [duration=4000] - 自動非表示までのミリ秒
   */
  function show(message, type = 'success', title = '', duration = 4000) {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
    }

    // アイコン設定
    const icons = {
      success: '✓',
      error:   '✕',
      warning: '!',
      info:    'i',
    };
    const icon = icons[type] ?? 'i';

    // デフォルトタイトル
    const defaultTitles = {
      success: '完了',
      error:   'エラー',
      warning: '警告',
      info:    '情報',
    };
    const resolvedTitle = title || defaultTitles[type] || '';

    // DOM 生成
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icon}</span>
      <div class="toast__body">
        ${resolvedTitle ? `<div class="toast__title">${_escape(resolvedTitle)}</div>` : ''}
        <div class="toast__message">${_escape(message)}</div>
      </div>
      <button class="toast__close" aria-label="閉じる">✕</button>
    `;

    // 閉じるボタン
    toast.querySelector('.toast__close').addEventListener('click', () => hide(toast));

    container.appendChild(toast);

    // アニメーション（次フレームで追加）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('is-visible'));
    });

    // 自動非表示
    if (duration > 0) {
      setTimeout(() => hide(toast), duration);
    }

    return toast;
  }

  function hide(toast) {
    toast.classList.add('is-hiding');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }

  return { show };
})();

/** グローバル関数として公開 */
function show_toast(message, type = 'success', title = '', duration = 4000) {
  return Toast.show(message, type, title, duration);
}


/* ══════════════════════════════════════════════
   3. 削除確認ダイアログ
   ══════════════════════════════════════════════ */

/**
 * 削除確認モーダルを表示する
 * @param {string}   message   - 確認メッセージ
 * @param {Function} callback  - 確認後に呼ぶコールバック
 * @param {string}   [confirmLabel='削除する'] - 確認ボタンラベル
 */
function confirm_delete(message, callback, confirmLabel = '削除する') {
  // 既存のモーダルがあれば削除
  const existing = document.getElementById('confirm-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'confirm-modal';
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div class="modal__body" style="text-align:center;padding-top:32px;padding-bottom:32px;">
        <div class="confirm-modal__icon confirm-modal__icon--danger">✕</div>
        <p class="confirm-modal__message" id="confirm-title">${_escape(message)}</p>
      </div>
      <div class="modal__footer" style="justify-content:center;">
        <button class="btn btn-secondary" id="confirm-cancel">キャンセル</button>
        <button class="btn btn-danger" id="confirm-ok">${_escape(confirmLabel)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  // 表示アニメーション
  requestAnimationFrame(() => {
    requestAnimationFrame(() => backdrop.classList.add('is-visible'));
  });

  function close() {
    backdrop.classList.remove('is-visible');
    backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
  }

  backdrop.querySelector('#confirm-cancel').addEventListener('click', close);

  backdrop.querySelector('#confirm-ok').addEventListener('click', () => {
    close();
    if (typeof callback === 'function') callback();
  });

  // バックドロップクリックでキャンセル
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  // Esc でキャンセル
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}


/* ══════════════════════════════════════════════
   4. セッションタイムアウト警告
   ══════════════════════════════════════════════ */

/**
 * セッション期限（14日）の残り1時間前にトーストで警告する
 * ページロード時刻を基準に計算（厳密ではないが実用上十分）
 */
(function init_session_warning() {
  // セッション有効期間 14日 → 残り1時間（3600秒）前に警告
  const SESSION_SECONDS   = 14 * 24 * 60 * 60;
  const WARN_BEFORE       = 60 * 60; // 1時間前
  const warnAfterMs = (SESSION_SECONDS - WARN_BEFORE) * 1000;
  if (warnAfterMs > 0) {
    setTimeout(() => {
      show_toast('セッションの期限が1時間以内に切れます。作業を保存してください。', 'warning', '', 10000);
    }, warnAfterMs);
  }
})();


/* ══════════════════════════════════════════════
   5. 画像アップロード
   ══════════════════════════════════════════════ */

/**
 * 画像ファイルを api/media.php に POST してアップロードする
 * @param {File}   file    - アップロードするファイル
 * @param {string} section - 保存先セクション（works, garden 等）
 * @param {string} slug    - 紐付ける投稿スラッグ（任意）
 * @returns {Promise<{url:string, path:string, width:number, height:number}>}
 */
async function upload_image_to_api(file, section = 'misc', slug = '') {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
  const fd   = new FormData();
  fd.append('file',    file);
  fd.append('section', section);
  if (slug) fd.append('slug', slug);

  const res  = await fetch('../api/media.php', {
    method:  'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-Token': csrf },
    body:    fd,
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? 'アップロードに失敗しました');
  return data.data; // { url, path, width, height }
}

/**
 * .upload-zone 要素を初期化する
 * クリック・ファイル選択ボタン・ドラッグ&ドロップに対応し、
 * options.section が指定されていれば api/media.php に自動アップロードする
 *
 * @param {HTMLElement} zone
 * @param {Object}      options
 * @param {string}      [options.section]     - アップロード先セクション
 * @param {string}      [options.slug]        - 投稿スラッグ
 * @param {Function}    [options.onUploaded]  - 完了コールバック (url, width, height) => void
 * @param {Function}    [options.onFiles]     - 独自処理コールバック（apiUrl 不使用時）
 * @param {string[]}    [options.accept]      - 許可 MIME タイプ
 */
function init_upload_zone(zone, options = {}) {
  if (!zone) return;

  const accept    = options.accept ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const fileInput = _create_file_input(accept);
  zone.appendChild(fileInput);

  // 「ファイルを選択」ボタンを注入（まだなければ）
  if (!zone.querySelector('.upload-zone__select-btn')) {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'btn btn-ghost upload-zone__select-btn';
    btn.textContent = 'ファイルを選択';
    const inner = zone.querySelector('.upload-zone__inner');
    if (inner) inner.appendChild(btn);
    else zone.appendChild(btn);
    btn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  }

  // ゾーン全体クリックでも選択
  zone.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) _handle_zone_files(Array.from(fileInput.files));
    fileInput.value = '';
  });

  zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('is-dragover'); });
  zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-dragover'); });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('is-dragover');
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) _handle_zone_files(files);
  });

  async function _handle_zone_files(files) {
    const valid = files.filter(f => accept.includes(f.type));
    if (!valid.length) { show_toast('対応していないファイル形式です（JPEG / PNG / WebP / GIF）', 'error'); return; }

    if (typeof options.onFiles === 'function') { options.onFiles(valid); return; }

    _zone_set_loading(zone, true);
    for (const file of valid) {
      try {
        const result = await upload_image_to_api(file, options.section ?? 'misc', options.slug ?? '');
        if (typeof options.onUploaded === 'function') options.onUploaded(result.url, result.width, result.height);
        show_toast('アップロードしました', 'success');
      } catch (err) {
        show_toast(err.message, 'error');
      }
    }
    _zone_set_loading(zone, false);
  }
}

/** アップロードゾーンのローディング状態を切り替える */
function _zone_set_loading(zone, loading) {
  zone.classList.toggle('is-uploading', loading);
  const btn = zone.querySelector('.upload-zone__select-btn');
  if (btn) { btn.disabled = loading; btn.textContent = loading ? 'アップロード中…' : 'ファイルを選択'; }
}

/**
 * URL テキスト入力欄の隣にアップロードボタンを追加する
 * input[data-upload-section] に自動適用される
 *
 * @param {HTMLInputElement} inputEl
 * @param {Object}           options
 * @param {string}           options.section
 * @param {string}           [options.slug]
 * @param {Function}         [options.onUploaded]
 */
function init_url_upload_btn(inputEl, options = {}) {
  if (!inputEl || inputEl.dataset.uploadInited) return;
  inputEl.dataset.uploadInited = '1';

  const wrapper = inputEl.parentElement;
  wrapper.classList.add('input-with-upload');

  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'btn btn-ghost btn-icon upload-url-btn';
  btn.title     = 'ファイルを選択してアップロード（ドロップも可）';
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

  const fileInput = document.createElement('input');
  fileInput.type    = 'file';
  fileInput.accept  = 'image/jpeg,image/png,image/webp,image/gif';
  fileInput.style.display = 'none';

  wrapper.appendChild(btn);
  wrapper.appendChild(fileInput);

  btn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    await _do_url_upload(file, inputEl, btn, options);
    fileInput.value = '';
  });

  // URL 欄へのドロップも対応
  inputEl.addEventListener('dragover',  (e) => { e.preventDefault(); inputEl.classList.add('is-dragover'); });
  inputEl.addEventListener('dragleave', ()  => inputEl.classList.remove('is-dragover'));
  inputEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    inputEl.classList.remove('is-dragover');
    const file = e.dataTransfer?.files[0];
    if (file) await _do_url_upload(file, inputEl, btn, options);
  });
}

/** URL フィールドへのアップロード共通処理 */
async function _do_url_upload(file, inputEl, btn, options) {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED.includes(file.type)) { show_toast('対応していないファイル形式です', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner spinner--sm"></span>';

  try {
    const result = await upload_image_to_api(file, options.section ?? 'misc', options.slug ?? '');

    inputEl.value = result.url;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));

    // 同じ .dynamic-row--media 内の幅・高さ・プレビューを更新
    const row = inputEl.closest('.dynamic-row--media');
    if (row) {
      const preview = row.querySelector('.media-row-preview');
      if (preview) preview.innerHTML = `<img src="${_escape(result.url)}" alt="">`;
      const wEl = row.querySelector('input[name$="_width[]"], input[name="image_width"]');
      const hEl = row.querySelector('input[name$="_height[]"], input[name="image_height"]');
      if (wEl && result.width)  wEl.value = result.width;
      if (hEl && result.height) hEl.value = result.height;
    }

    if (typeof options.onUploaded === 'function') options.onUploaded(result.url, result.width, result.height);
    show_toast('アップロードしました', 'success');
  } catch (err) {
    show_toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  }
}

/**
 * Markdown テキストエリアの上部にアップロードツールバーを追加する
 * textarea[data-md-upload-section] に自動適用される
 *
 * @param {HTMLTextAreaElement} textareaEl
 * @param {Object}              options
 * @param {string}              options.section
 * @param {string}              [options.slug]
 */
function init_markdown_upload_toolbar(textareaEl, options = {}) {
  if (!textareaEl || textareaEl.dataset.mdToolbarInited) return;
  textareaEl.dataset.mdToolbarInited = '1';

  const toolbar = document.createElement('div');
  toolbar.className = 'md-toolbar';

  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'btn btn-sm btn-ghost md-toolbar__btn';
  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;vertical-align:middle"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>画像を挿入';

  const fileInput = document.createElement('input');
  fileInput.type     = 'file';
  fileInput.accept   = 'image/jpeg,image/png,image/webp,image/gif';
  fileInput.multiple = true;
  fileInput.style.display = 'none';

  toolbar.appendChild(btn);
  toolbar.appendChild(fileInput);

  btn.addEventListener('click', () => fileInput.click());

  const _md_upload_files = async (files) => {
    btn.disabled    = true;
    btn.textContent = 'アップロード中…';
    for (const file of files) {
      try {
        const result = await upload_image_to_api(file, options.section ?? 'misc', options.slug ?? '');
        insert_at_cursor(textareaEl, `\n![](${result.url})\n`);
        show_toast('画像を挿入しました', 'success');
      } catch (err) {
        show_toast(err.message, 'error');
      }
    }
    btn.disabled  = false;
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px;vertical-align:middle"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>画像を挿入';
    fileInput.value = '';
  };

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length) await _md_upload_files(files);
  });

  // テキストエリアへの直接ドロップで画像挿入
  textareaEl.addEventListener('dragover', (e) => {
    if (Array.from(e.dataTransfer?.items ?? []).some(i => i.type.startsWith('image/'))) {
      e.preventDefault();
      textareaEl.classList.add('is-dragover');
    }
  });
  textareaEl.addEventListener('dragleave', () => textareaEl.classList.remove('is-dragover'));
  textareaEl.addEventListener('drop', async (e) => {
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    textareaEl.classList.remove('is-dragover');
    await _md_upload_files(files);
  });

  textareaEl.parentElement.insertBefore(toolbar, textareaEl);
}

/**
 * テキストエリアのカーソル位置にテキストを挿入する
 * @param {HTMLTextAreaElement} el
 * @param {string}              text
 */
function insert_at_cursor(el, text) {
  const start = el.selectionStart ?? el.value.length;
  const end   = el.selectionEnd   ?? el.value.length;
  el.value = el.value.substring(0, start) + text + el.value.substring(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.focus();
}

/**
 * 指定コンテナ内の [data-upload-section] 入力欄と
 * [data-md-upload-section] テキストエリアを一括初期化する
 * 動的に追加された行（テンプレートのクローン）にも適用可能
 * @param {HTMLElement} [root=document]
 */
function init_upload_fields(root = document) {
  root.querySelectorAll('input[data-upload-section]').forEach(input => {
    init_url_upload_btn(input, {
      section: input.dataset.uploadSection,
      slug:    input.dataset.uploadSlug ?? '',
    });
  });
  root.querySelectorAll('textarea[data-md-upload-section]').forEach(ta => {
    init_markdown_upload_toolbar(ta, {
      section: ta.dataset.mdUploadSection,
      slug:    ta.dataset.mdUploadSlug ?? '',
    });
  });
}

/** ファイル input を生成 */
function _create_file_input(accept) {
  const input = document.createElement('input');
  input.type      = 'file';
  input.multiple  = true;
  input.accept    = accept.join(',');
  input.className = 'upload-zone__input';
  return input;
}


/* ══════════════════════════════════════════════
   6. デプロイボタンの非同期実行とステータス表示
   ══════════════════════════════════════════════ */

/**
 * デプロイを実行する
 * @param {HTMLButtonElement} btn      - デプロイボタン
 * @param {string}            apiUrl   - デプロイAPIのURL（デフォルト: /api/deploy.php）
 * @param {HTMLElement}       [status] - ステータス表示要素（.deploy-status）
 */
async function trigger_deploy(btn, apiUrl = '../api/deploy.php', status = null) {
  if (!btn || btn.classList.contains('is-deploying')) return;

  const statusEl  = status ?? document.querySelector('.deploy-status');
  const statusText = statusEl?.querySelector('.deploy-status__text');

  // 開始状態
  btn.classList.add('is-deploying');
  btn.textContent = 'デプロイ中…';
  btn.disabled = true;

  if (statusEl) {
    statusEl.className = 'deploy-status deploy-status--deploying';
    if (statusText) statusText.textContent = 'デプロイ中…';
  }

  try {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrfToken,
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error ?? 'デプロイに失敗しました');
    }

    // 成功
    show_toast(data.message ?? 'デプロイをトリガーしました', 'success', 'デプロイ');
    if (statusEl) {
      statusEl.className = 'deploy-status deploy-status--success';
      if (statusText) statusText.textContent = 'デプロイ完了';
    }
  } catch (err) {
    show_toast(err.message ?? 'デプロイに失敗しました', 'error', 'デプロイ失敗');
    if (statusEl) {
      statusEl.className = 'deploy-status deploy-status--error';
      if (statusText) statusText.textContent = 'デプロイ失敗';
    }
  } finally {
    btn.classList.remove('is-deploying');
    btn.textContent = 'デプロイ';
    btn.disabled = false;
  }
}

/** デプロイボタンを自動初期化 */
function init_deploy_btn() {
  const btn = document.getElementById('deploy-btn');
  if (!btn) return;
  btn.addEventListener('click', () => trigger_deploy(btn));
}


/* ══════════════════════════════════════════════
   7. テーブルの行クリックで詳細ページに遷移
   ══════════════════════════════════════════════ */

/**
 * クリッカブルテーブル行を初期化する
 * data-href 属性に遷移先 URL を設定する
 */
function init_clickable_rows() {
  document.querySelectorAll('.table tbody tr.is-clickable[data-href]').forEach(row => {
    row.addEventListener('click', (e) => {
      // リンク・ボタン・フォーム要素のクリックは無視
      if (e.target.closest('a, button, input, select, textarea')) return;
      window.location.href = row.dataset.href;
    });
  });
}


/* ══════════════════════════════════════════════
   8. 文字数カウンター付きテキストエリア
   ══════════════════════════════════════════════ */

/**
 * 文字数カウンターを初期化する
 * textarea に data-maxlength と対応する .form-counter があれば自動連動
 */
function init_char_counters() {
  document.querySelectorAll('textarea[data-maxlength], input[data-maxlength]').forEach(field => {
    const max     = parseInt(field.dataset.maxlength, 10);
    const countEl = _find_counter(field);
    if (!countEl) return;

    // 初期表示
    update(field.value.length);

    field.addEventListener('input', () => update(field.value.length));

    function update(len) {
      countEl.textContent = `${len} / ${max}`;
      countEl.classList.remove('is-warn', 'is-over');
      if (len > max) {
        countEl.classList.add('is-over');
      } else if (len > max * 0.9) {
        countEl.classList.add('is-warn');
      }
    }
  });
}

/** フィールドに対応するカウンター要素を探す */
function _find_counter(field) {
  // 次の兄弟の .form-counter
  let sibling = field.nextElementSibling;
  while (sibling) {
    if (sibling.classList.contains('form-counter')) return sibling;
    sibling = sibling.nextElementSibling;
  }
  // 親要素内の .form-counter
  return field.closest('.form-group')?.querySelector('.form-counter') ?? null;
}


/* ══════════════════════════════════════════════
   ユーティリティ
   ══════════════════════════════════════════════ */

/** XSS 対策: HTML エスケープ */
function _escape(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** 相対時刻フォーマット（例: 3分前） */
function format_relative_time(dateStr) {
  const date  = new Date(dateStr);
  const now   = new Date();
  const diff  = Math.floor((now - date) / 1000); // 秒

  if (diff < 60)    return 'たった今';
  if (diff < 3600)  return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;

  return date.toLocaleDateString('ja-JP');
}

/** 全 .rel-time 要素に相対時刻を適用 */
function init_rel_time() {
  document.querySelectorAll('[data-rel-time]').forEach(el => {
    const raw = el.dataset.relTime ?? el.textContent;
    if (raw) el.textContent = format_relative_time(raw);
  });
}

/** 削除ボタンの汎用ハンドラ */
function init_delete_buttons() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-url]');
    if (!btn) return;

    const url     = btn.dataset.deleteUrl;
    const message = btn.dataset.deleteMessage ?? 'このアイテムを削除しますか？';
    const reload  = btn.dataset.deleteReload !== 'false';

    confirm_delete(message, async () => {
      try {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
        const res  = await fetch(url, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': csrf,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: '_method=DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? '削除に失敗しました');

        show_toast(data.message ?? '削除しました', 'success');

        if (reload) {
          setTimeout(() => location.reload(), 800);
        } else {
          // 行を削除
          btn.closest('tr')?.remove();
        }
      } catch (err) {
        show_toast(err.message, 'error');
      }
    });
  });
}


/* ══════════════════════════════════════════════
   初期化
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  Sidebar.init();
  init_deploy_btn();
  init_clickable_rows();
  init_char_counters();
  init_rel_time();
  init_delete_buttons();
  init_upload_fields();
  init_rich_editors();
});

/* ══════════════════════════════════════════════
   Quill リッチテキストエディタ初期化
   ══════════════════════════════════════════════ */

/**
 * data-rich-editor 属性を持つ textarea を Quill エディタに変換する。
 * フォーム送信時に hidden input へ HTML を書き戻す。
 */
function init_rich_editors() {
  if (typeof Quill === 'undefined') return;

  document.querySelectorAll('textarea[data-rich-editor]').forEach(textarea => {
    // hidden input を作成（フォーム送信用）
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = textarea.name;
    hidden.value = textarea.value;
    textarea.parentNode.insertBefore(hidden, textarea);

    // エディタ用コンテナ
    const container = document.createElement('div');
    container.className = 'rich-editor-container';
    textarea.parentNode.insertBefore(container, textarea);

    // textarea を非表示
    textarea.removeAttribute('name');
    textarea.style.display = 'none';

    // 画像アップロード用の隠しファイル入力
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
    fileInput.style.display = 'none';
    container.appendChild(fileInput);

    // アップロード用メタ情報を取得
    const uploadSection = textarea.dataset.mdUploadSection || 'misc';
    const uploadSlug = textarea.dataset.mdUploadSlug || '';

    // Quill 初期化（標準ツールバー）
    const quill = new Quill(container, {
      theme: 'snow',
      placeholder: textarea.placeholder || '本文を入力…',
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, 4, false] }],
            ['bold', 'italic'],
            ['blockquote'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            ['clean'],
          ],
          handlers: {
            image: function() {
              fileInput.click();
            },
          },
        },
      },
    });

    // [[リンク]] ボタンをツールバー末尾に追加
    // Quill snow テーマはツールバーを container の直前の兄弟要素として生成する
    const toolbar = container.previousElementSibling?.classList.contains('ql-toolbar')
      ? container.previousElementSibling
      : container.querySelector('.ql-toolbar');
    if (toolbar) {
      const group = document.createElement('span');
      group.className = 'ql-formats';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ql-bracket-link';
      btn.title = 'ブラケットリンク [[ページ名]]';
      btn.textContent = '[[ ]]';
      btn.addEventListener('click', () => {
        const range = quill.getSelection(true);
        if (range.length > 0) {
          const text = quill.getText(range.index, range.length);
          quill.deleteText(range.index, range.length);
          quill.insertText(range.index, `[[${text}]]`);
          quill.setSelection(range.index + text.length + 4);
        } else {
          quill.insertText(range.index, '[[]]');
          quill.setSelection(range.index + 2);
        }
      });
      group.appendChild(btn);
      toolbar.appendChild(group);
    }

    // ファイル選択時: CMS APIにアップロード → エディタに挿入
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      fileInput.value = '';

      // アップロード中の表示
      const range = quill.getSelection(true);
      quill.insertText(range.index, '画像をアップロード中…', { color: '#999' });
      quill.setSelection(range.index + 11);

      try {
        const result = await upload_image_to_api(file, uploadSection, uploadSlug);
        // プレースホルダーを削除
        quill.deleteText(range.index, 11);
        // 画像を挿入
        quill.insertEmbed(range.index, 'image', result.url);
        quill.setSelection(range.index + 1);
        show_toast('画像を挿入しました', 'success');
      } catch (err) {
        // プレースホルダーを削除
        quill.deleteText(range.index, 11);
        show_toast(err.message || 'アップロードに失敗しました', 'error');
      }
    });

    // ドラッグ＆ドロップで画像挿入
    quill.root.addEventListener('drop', async (e) => {
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      const file = files[0];
      if (!file.type.startsWith('image/')) return;

      e.preventDefault();
      e.stopPropagation();

      const range = quill.getSelection(true);
      quill.insertText(range.index, '画像をアップロード中…', { color: '#999' });

      try {
        const result = await upload_image_to_api(file, uploadSection, uploadSlug);
        quill.deleteText(range.index, 11);
        quill.insertEmbed(range.index, 'image', result.url);
        quill.setSelection(range.index + 1);
        show_toast('画像を挿入しました', 'success');
      } catch (err) {
        quill.deleteText(range.index, 11);
        show_toast(err.message || 'アップロードに失敗しました', 'error');
      }
    });

    // 既存コンテンツをセット（HTMLまたはプレーンテキスト）
    const initial = hidden.value;
    if (initial) {
      if (initial.includes('<') && initial.includes('>')) {
        quill.root.innerHTML = initial;
      } else {
        quill.root.innerHTML = initial
          .split(/\n{2,}/)
          .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
          .join('');
      }
    }

    // 変更時に hidden input を更新
    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      hidden.value = (html === '<p><br></p>' || html === '<p></p>') ? '' : html;
    });

    // フォーム送信前にも同期
    const form = textarea.closest('form');
    if (form) {
      form.addEventListener('submit', () => {
        const html = quill.root.innerHTML;
        hidden.value = (html === '<p><br></p>' || html === '<p></p>') ? '' : html;
      });
    }

    // 操作ヒントを追加
    const hint = document.createElement('div');
    hint.className = 'rich-editor-hint';
    hint.innerHTML = '<span><kbd>Enter</kbd> 段落（余白あり）</span><span><kbd>Shift</kbd>+<kbd>Enter</kbd> 改行（余白なし）</span>';
    container.appendChild(hint);
  });
}

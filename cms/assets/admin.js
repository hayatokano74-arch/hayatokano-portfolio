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
   4. フォームの AJAX 送信
   ══════════════════════════════════════════════ */

/**
 * フォームを AJAX で送信する
 * @param {HTMLFormElement} form      - 対象フォーム
 * @param {string}          url       - 送信先 URL
 * @param {Function}        onSuccess - 成功時コールバック (data) => void
 * @param {Function}        [onError] - エラー時コールバック (error) => void
 */
async function submit_form(form, url, onSuccess, onError) {
  if (!form) return;

  const submitBtn = form.querySelector('[type="submit"]');
  const originalText = submitBtn?.textContent ?? '';

  // 送信中状態
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    submitBtn.textContent = '送信中…';
  }

  try {
    const formData = new FormData(form);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const errMsg = data?.error ?? `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    if (typeof onSuccess === 'function') {
      onSuccess(data);
    } else {
      show_toast(data?.message ?? '保存しました', 'success');
    }
  } catch (err) {
    const msg = err.message ?? '予期しないエラーが発生しました';
    if (typeof onError === 'function') {
      onError(err);
    } else {
      show_toast(msg, 'error');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      submitBtn.textContent = originalText;
    }
  }
}


/* ══════════════════════════════════════════════
   5. 画像アップロードのドラッグ&ドロップ
   ══════════════════════════════════════════════ */

/**
 * アップロードゾーンを初期化する
 * @param {HTMLElement} zone     - .upload-zone 要素
 * @param {Object}      options
 * @param {Function}    options.onFiles - ファイル選択時コールバック (files: FileList) => void
 * @param {string[]}    [options.accept=['image/jpeg','image/png','image/webp','image/gif']]
 */
function init_upload_zone(zone, options = {}) {
  if (!zone) return;

  const accept  = options.accept ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const input   = zone.querySelector('.upload-zone__input') ?? _create_file_input(accept);

  if (!zone.contains(input)) zone.appendChild(input);

  // クリックでファイル選択
  zone.addEventListener('click', (e) => {
    if (e.target !== input) input.click();
  });

  // ファイル選択
  input.addEventListener('change', () => {
    if (input.files?.length) _handle_files(input.files);
  });

  // ドラッグオーバー
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('is-dragover');
  });

  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget)) {
      zone.classList.remove('is-dragover');
    }
  });

  // ドロップ
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('is-dragover');
    const files = e.dataTransfer?.files;
    if (files?.length) _handle_files(files);
  });

  function _handle_files(files) {
    // 許可 MIME タイプでフィルタ
    const valid = Array.from(files).filter(f => accept.includes(f.type));
    if (valid.length === 0) {
      show_toast('対応していないファイル形式です（JPEG / PNG / WebP / GIF）', 'error');
      return;
    }
    if (typeof options.onFiles === 'function') {
      options.onFiles(valid);
    }
    // プレビュー表示（オプション）
    if (options.preview) {
      _render_preview(zone, valid, options.preview);
    }
  }
}

/** ファイル input を生成 */
function _create_file_input(accept) {
  const input = document.createElement('input');
  input.type     = 'file';
  input.multiple = true;
  input.accept   = accept.join(',');
  input.className = 'upload-zone__input';
  return input;
}

/** プレビューグリッドにサムネイルを追加 */
function _render_preview(zone, files, previewContainer) {
  const container = typeof previewContainer === 'string'
    ? document.querySelector(previewContainer)
    : previewContainer;
  if (!container) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const item = document.createElement('div');
      item.className = 'upload-preview__item';
      item.innerHTML = `
        <img src="${e.target.result}" alt="${_escape(file.name)}" class="upload-preview__img">
        <button type="button" class="upload-preview__remove" aria-label="削除">✕</button>
      `;
      item.querySelector('.upload-preview__remove').addEventListener('click', () => item.remove());
      container.appendChild(item);
    };
    reader.readAsDataURL(file);
  });
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
});

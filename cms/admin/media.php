<?php
// メディア管理ページ — アップロード済み画像の一覧・アップロード・削除・URLコピー

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';

require_auth();

$page_title = 'メディア管理';
$active_nav = 'media';
ob_start();
?>

<div class="media-manager">

  <!-- ── ツールバー ── -->
  <div class="media-toolbar">
    <div class="media-toolbar__left">
      <div class="media-filter-wrap">
        <label class="sr-only" for="section-filter">セクション</label>
        <select id="section-filter" class="form-control form-control--sm">
          <option value="">すべてのセクション</option>
        </select>
      </div>
      <span class="media-count" id="media-count">読み込み中…</span>
    </div>
    <div class="media-toolbar__right">
      <label class="btn btn-primary btn-sm" id="media-upload-label">
        <input type="file" id="media-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
        + アップロード
      </label>
    </div>
  </div>

  <!-- セクション選択（アップロード先） -->
  <div class="media-upload-meta" id="upload-meta" style="display:none">
    <label class="form-label" for="upload-section-select">アップロード先セクション</label>
    <select id="upload-section-select" class="form-control form-control--sm" style="width:200px">
      <option value="misc">misc（未分類）</option>
      <option value="works">works</option>
      <option value="me-no-hoshi">me-no-hoshi</option>
      <option value="news">news</option>
      <option value="garden">garden</option>
      <option value="about">about</option>
      <option value="timeline">timeline</option>
    </select>
    <button class="btn btn-ghost btn-sm" id="upload-cancel-btn">キャンセル</button>
  </div>

  <!-- アップロード進捗 -->
  <div class="media-upload-progress" id="upload-progress" style="display:none">
    <div class="media-upload-progress__track">
      <div class="media-upload-progress__fill" id="upload-progress-fill"></div>
    </div>
    <span class="media-upload-progress__text" id="upload-progress-text">アップロード中…</span>
  </div>

  <!-- グリッド -->
  <div class="media-grid" id="media-grid"></div>

  <!-- 空状態 -->
  <div class="media-empty" id="media-empty" style="display:none">
    <p>画像がありません</p>
  </div>

  <!-- ページネーション -->
  <div class="media-pagination" id="media-pagination" style="display:none">
    <button class="btn btn-ghost btn-sm" id="media-prev" disabled>← 前へ</button>
    <span class="media-pagination__info" id="pagination-info"></span>
    <button class="btn btn-ghost btn-sm" id="media-next">次へ →</button>
  </div>

</div><!-- /.media-manager -->

<!-- 画像詳細モーダル -->
<div class="modal-backdrop" id="media-modal" style="display:none" aria-hidden="true">
  <div class="modal media-detail-modal" role="dialog" aria-modal="true" aria-labelledby="media-modal-title">
    <div class="modal__header">
      <h3 class="modal__title" id="media-modal-title">画像詳細</h3>
      <button class="modal__close" id="media-modal-close" aria-label="閉じる">✕</button>
    </div>
    <div class="modal__body">
      <div class="media-modal__preview">
        <img id="media-modal-img" src="" alt=""
             style="max-width:100%;max-height:360px;object-fit:contain;display:block;margin:0 auto;border-radius:var(--radius)">
      </div>
      <table class="media-meta-table">
        <tr>
          <th>URL</th>
          <td><code id="modal-url" style="word-break:break-all;font-size:var(--font-xs);color:var(--accent)"></code></td>
        </tr>
        <tr><th>ファイルサイズ</th><td id="modal-size"></td></tr>
        <tr><th>幅×高さ</th><td id="modal-dims"></td></tr>
        <tr><th>セクション</th><td id="modal-section"></td></tr>
        <tr><th>投稿スラッグ</th><td id="modal-slug"></td></tr>
        <tr><th>アップロード日時</th><td id="modal-date"></td></tr>
      </table>
    </div>
    <div class="modal__footer">
      <button class="btn btn-ghost" id="media-modal-close2">閉じる</button>
      <button class="btn btn-ghost" id="modal-copy-btn">URLをコピー</button>
      <button class="btn btn-danger" id="modal-delete-btn">削除</button>
    </div>
  </div>
</div>

<style>
/* ── メディア管理ページ固有スタイル ── */
.media-manager { display:flex; flex-direction:column; gap:var(--s-5); }

.media-toolbar {
  display:flex; align-items:center; justify-content:space-between;
  gap:var(--s-4); flex-wrap:wrap;
}
.media-toolbar__left  { display:flex; align-items:center; gap:var(--s-4); }
.media-toolbar__right { display:flex; align-items:center; gap:var(--s-3); }
.media-count { font-size:var(--font-sm); color:var(--text-3); white-space:nowrap; }

.media-upload-meta {
  display:flex; align-items:center; gap:var(--s-3);
  padding:var(--s-3) var(--s-4);
  background:var(--accent-bg); border:1px solid var(--accent);
  border-radius:var(--radius);
}

.media-upload-progress {
  display:flex; align-items:center; gap:var(--s-3);
  padding:var(--s-3) var(--s-4);
  background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
}
.media-upload-progress__track {
  flex:1; height:4px; background:var(--border); border-radius:2px; overflow:hidden;
}
.media-upload-progress__fill {
  height:100%; background:var(--accent); width:0%; transition:width .2s ease;
}
.media-upload-progress__text { font-size:var(--font-sm); color:var(--text-2); white-space:nowrap; }

/* グリッド */
.media-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));
  gap:var(--s-3);
}
.media-empty {
  text-align:center; padding:var(--s-12);
  color:var(--text-3); font-size:var(--font-sm);
}

/* カード */
.media-card {
  position:relative; background:var(--card);
  border:1px solid var(--border); border-radius:var(--radius);
  overflow:hidden; cursor:pointer;
  transition:border-color var(--transition), box-shadow var(--transition);
}
.media-card:hover { border-color:var(--accent); box-shadow:0 2px 8px rgba(0,0,0,.14); }

.media-card__img-wrap { aspect-ratio:4/3; background:var(--bg); overflow:hidden; }
.media-card__img {
  width:100%; height:100%; object-fit:cover; display:block;
  opacity:0; transition:opacity .3s ease;
}
.media-card__img.is-loaded { opacity:1; }

.media-card__info { padding:var(--s-2) var(--s-3); }
.media-card__section {
  font-size:var(--font-xs); color:var(--accent);
  font-weight:600; letter-spacing:.06em; text-transform:uppercase;
}
.media-card__name {
  font-size:var(--font-xs); color:var(--text-3);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  margin-top:2px;
}

/* ホバーアクション */
.media-card__actions {
  position:absolute; top:var(--s-2); right:var(--s-2);
  display:flex; gap:var(--s-1);
  opacity:0; transition:opacity var(--transition);
}
.media-card:hover .media-card__actions { opacity:1; }
.media-card__btn {
  width:28px; height:28px; border-radius:var(--radius-sm);
  background:rgba(0,0,0,.55); backdrop-filter:blur(4px);
  color:#fff; font-size:11px; display:flex; align-items:center;
  justify-content:center; border:none; cursor:pointer;
  transition:background var(--transition);
}
.media-card__btn:hover { background:rgba(0,0,0,.8); }
.media-card__btn--danger:hover { background:var(--danger); }

/* スケルトン */
.media-card--skeleton .media-card__img-wrap { background:var(--border); }
.media-card--skeleton .media-card__info { opacity:.4; }
@keyframes shimmer { from{opacity:.5} to{opacity:1} }
.media-card--skeleton { animation:shimmer 1s ease-in-out infinite alternate; }

/* ページネーション */
.media-pagination {
  display:flex; align-items:center; justify-content:center;
  gap:var(--s-4); padding:var(--s-4) 0;
}
.media-pagination__info { font-size:var(--font-sm); color:var(--text-3); }

/* モーダル */
.media-detail-modal { width:min(680px, 95vw); }
.media-modal__preview {
  background:var(--bg); border-radius:var(--radius);
  padding:var(--s-4); margin-bottom:var(--s-5);
}
.media-meta-table { width:100%; border-collapse:collapse; font-size:var(--font-sm); }
.media-meta-table th,
.media-meta-table td {
  padding:var(--s-2) var(--s-3);
  border-bottom:1px solid var(--border-subtle);
  text-align:left;
}
.media-meta-table th { width:120px; color:var(--text-3); font-weight:500; }
.modal__footer {
  display:flex; gap:var(--s-3); justify-content:flex-end;
  padding-top:var(--s-4); border-top:1px solid var(--border-subtle); margin-top:var(--s-4);
}
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

@media (max-width:600px) {
  .media-grid { grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); }
  .media-toolbar { flex-direction:column; align-items:stretch; }
}
</style>

<script>
(function() {
  const LIMIT       = 60;
  const API_BASE    = '../api/media.php';
  const URL_PREFIX  = '<?= rtrim(UPLOAD_URL_PREFIX, '/') ?>';
  const csrf        = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

  let state = { section: '', offset: 0, total: 0 };
  let currentItem = null;

  // 要素参照
  const grid        = document.getElementById('media-grid');
  const emptyEl     = document.getElementById('media-empty');
  const countEl     = document.getElementById('media-count');
  const filterSel   = document.getElementById('section-filter');
  const pagination  = document.getElementById('media-pagination');
  const prevBtn     = document.getElementById('media-prev');
  const nextBtn     = document.getElementById('media-next');
  const pageInfo    = document.getElementById('pagination-info');
  const uploadInput = document.getElementById('media-upload-input');
  const uploadMeta  = document.getElementById('upload-meta');
  const uploadSec   = document.getElementById('upload-section-select');
  const progressEl  = document.getElementById('upload-progress');
  const progressFill= document.getElementById('upload-progress-fill');
  const progressTxt = document.getElementById('upload-progress-text');
  const modal       = document.getElementById('media-modal');

  // ─ ユーティリティ ─
  function esc(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function fmt_bytes(b) {
    if (!b) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }
  function fmt_date(s) {
    return s ? s.replace('T',' ').slice(0,16) : '—';
  }
  function item_url(item) {
    return URL_PREFIX + item.path;
  }

  // ─ データ取得 ─
  async function load(section, offset) {
    show_skeletons(12);
    const params = new URLSearchParams({ limit: LIMIT, offset });
    if (section) params.set('section', section);

    try {
      const res  = await fetch(`${API_BASE}?${params}`);
      const body = await res.json();
      if (!body.ok) throw new Error(body.error ?? '取得失敗');

      const d = body.data;
      state = { section, offset, total: d.total };
      render_filter_options(d.sections ?? []);
      render_grid(d.items);
      render_pagination();
      countEl.textContent = `${d.total} 件`;
    } catch (err) {
      show_toast('データの取得に失敗しました: ' + err.message, 'error');
    }
  }

  // ─ セクションフィルタ更新 ─
  function render_filter_options(sections) {
    const cur = filterSel.value;
    while (filterSel.options.length > 1) filterSel.remove(1);
    sections.forEach(({ section, cnt }) => {
      const o = new Option(`${section} (${cnt})`, section);
      filterSel.add(o);
    });
    filterSel.value = cur;
  }

  // ─ グリッド描画 ─
  function render_grid(items) {
    grid.querySelectorAll('.media-card').forEach(el => el.remove());
    emptyEl.style.display = items.length ? 'none' : '';

    items.forEach(item => {
      const url  = item_url(item);
      const card = document.createElement('div');
      card.className    = 'media-card';
      card.dataset.path = item.path;
      card.innerHTML = `
        <div class="media-card__img-wrap">
          <img class="media-card__img" data-src="${esc(url)}" alt="">
        </div>
        <div class="media-card__info">
          <div class="media-card__section">${esc(item.section)}</div>
          <div class="media-card__name">${esc(item.filename)}</div>
        </div>
        <div class="media-card__actions">
          <button class="media-card__btn js-copy" title="URLをコピー" aria-label="URLをコピー">⧉</button>
          <button class="media-card__btn media-card__btn--danger js-delete" title="削除" aria-label="削除">✕</button>
        </div>`;

      // 遅延ロード
      lazy_load(card.querySelector('.media-card__img'));

      card.addEventListener('click', (e) => {
        if (e.target.closest('.media-card__btn')) return;
        open_modal(item);
      });
      card.querySelector('.js-copy').addEventListener('click', (e) => {
        e.stopPropagation(); copy_url(url);
      });
      card.querySelector('.js-delete').addEventListener('click', (e) => {
        e.stopPropagation(); delete_item(item, card);
      });

      grid.appendChild(card);
    });
  }

  // ─ スケルトン ─
  function show_skeletons(n) {
    grid.querySelectorAll('.media-card').forEach(el => el.remove());
    emptyEl.style.display = 'none';
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'media-card media-card--skeleton';
      s.innerHTML = '<div class="media-card__img-wrap"></div><div class="media-card__info"><div class="media-card__section">loading</div><div class="media-card__name">———</div></div>';
      grid.appendChild(s);
    }
  }

  // ─ Intersection Observer で遅延ロード ─
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.onload  = () => img.classList.add('is-loaded');
      img.onerror = () => img.closest('.media-card__img-wrap').style.background = 'var(--border)';
      io.unobserve(img);
    });
  }, { rootMargin: '200px' });

  function lazy_load(img) { io.observe(img); }

  // ─ ページネーション ─
  function render_pagination() {
    const pages = Math.ceil(state.total / LIMIT);
    if (pages <= 1) { pagination.style.display = 'none'; return; }
    pagination.style.display = '';
    const cur = Math.floor(state.offset / LIMIT) + 1;
    pageInfo.textContent = `${cur} / ${pages} ページ（全 ${state.total} 件）`;
    prevBtn.disabled = state.offset === 0;
    nextBtn.disabled = state.offset + LIMIT >= state.total;
  }

  prevBtn.addEventListener('click', () => {
    if (state.offset > 0) load(state.section, Math.max(0, state.offset - LIMIT));
  });
  nextBtn.addEventListener('click', () => {
    if (state.offset + LIMIT < state.total) load(state.section, state.offset + LIMIT);
  });

  // ─ フィルタ ─
  filterSel.addEventListener('change', () => load(filterSel.value, 0));

  // ─ URLコピー ─
  function copy_url(url) {
    navigator.clipboard.writeText(url)
      .then(() => show_toast('URLをコピーしました', 'success'))
      .catch(() => show_toast('コピーに失敗しました', 'error'));
  }

  // ─ 削除 ─
  async function delete_item(item, cardEl) {
    confirm_delete(`「${item.filename}」を削除しますか？この操作は元に戻せません。`, async () => {
      try {
        const res  = await fetch(`${API_BASE}?path=${encodeURIComponent(item.path)}`, {
          method:  'DELETE',
          headers: { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
        });
        const body = await res.json();
        if (!res.ok || !body.ok) throw new Error(body.error ?? '削除に失敗しました');
        cardEl?.remove();
        state.total--;
        countEl.textContent = `${state.total} 件`;
        show_toast('削除しました', 'success');
        close_modal();
      } catch (err) {
        show_toast(err.message, 'error');
      }
    });
  }

  // ─ モーダル ─
  function open_modal(item) {
    currentItem = item;
    const url = item_url(item);
    document.getElementById('media-modal-img').src        = url;
    document.getElementById('modal-url').textContent     = url;
    document.getElementById('modal-size').textContent    = fmt_bytes(item.size_bytes);
    document.getElementById('modal-dims').textContent    = item.width && item.height
      ? `${item.width} × ${item.height} px` : '—';
    document.getElementById('modal-section').textContent = item.section || '—';
    document.getElementById('modal-slug').textContent    = item.slug    || '—';
    document.getElementById('modal-date').textContent    = fmt_date(item.created_at);
    modal.style.display = '';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close_modal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentItem = null;
  }

  document.getElementById('media-modal-close').addEventListener('click',  close_modal);
  document.getElementById('media-modal-close2').addEventListener('click', close_modal);
  modal.addEventListener('click', e => { if (e.target === modal) close_modal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentItem) close_modal(); });

  document.getElementById('modal-copy-btn').addEventListener('click', () => {
    if (currentItem) copy_url(item_url(currentItem));
  });
  document.getElementById('modal-delete-btn').addEventListener('click', () => {
    if (!currentItem) return;
    const card = grid.querySelector(`[data-path="${CSS.escape(currentItem.path)}"]`);
    delete_item(currentItem, card);
  });

  // ─ アップロード ─
  document.getElementById('media-upload-label').addEventListener('click', () => {
    uploadMeta.style.display = '';
  });
  document.getElementById('upload-cancel-btn').addEventListener('click', () => {
    uploadMeta.style.display = 'none';
    uploadInput.value = '';
  });

  uploadInput.addEventListener('change', async () => {
    const files = Array.from(uploadInput.files);
    if (!files.length) return;
    uploadMeta.style.display = 'none';
    await upload_files(files, uploadSec.value || 'misc');
    uploadInput.value = '';
  });

  async function upload_files(files, section) {
    progressEl.style.display = '';
    let done = 0;

    for (const file of files) {
      const pct = Math.round(done / files.length * 100);
      progressFill.style.width = pct + '%';
      progressTxt.textContent  = `${done + 1} / ${files.length} アップロード中…`;

      try {
        const fd = new FormData();
        fd.append('file',    file);
        fd.append('section', section);
        const res  = await fetch(API_BASE, {
          method:  'POST',
          headers: { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
          body:    fd,
        });
        const body = await res.json();
        if (!res.ok || !body.ok) throw new Error(body.error ?? 'アップロードに失敗しました');
        show_toast(`${file.name} をアップロードしました`, 'success');
      } catch (err) {
        show_toast(`${file.name}: ${err.message}`, 'error');
      }
      done++;
    }

    progressFill.style.width = '100%';
    progressTxt.textContent  = 'アップロード完了';
    setTimeout(() => { progressEl.style.display = 'none'; }, 1500);

    // グリッドを再読み込み（現在のセクション・オフセット維持）
    load(state.section, state.offset);
  }

  // ─ 初期ロード ─
  load('', 0);
})();
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

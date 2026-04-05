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

<!-- ライトボックス -->
<div class="lightbox" id="media-modal" style="display:none">
  <button class="lightbox__close" id="media-modal-close" aria-label="閉じる">✕</button>
  <button class="lightbox__nav lightbox__nav--prev" id="lightbox-prev" aria-label="前の画像">‹</button>
  <button class="lightbox__nav lightbox__nav--next" id="lightbox-next" aria-label="次の画像">›</button>
  <div class="lightbox__main">
    <img id="media-modal-img" src="" alt="" class="lightbox__img">
  </div>
  <div class="lightbox__bar">
    <div class="lightbox__info">
      <span id="modal-filename" style="font-weight:500;"></span>
      <span id="modal-dims" style="color:var(--text-3);"></span>
      <span id="modal-size" style="color:var(--text-3);"></span>
    </div>
    <div class="lightbox__actions">
      <button class="btn btn-sm btn-ghost" id="modal-copy-btn">URLをコピー</button>
      <button class="btn btn-sm btn-danger" id="modal-delete-btn">削除</button>
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

/* ライトボックス */
.lightbox {
  position:fixed; inset:0; z-index:1000;
  background:rgba(0,0,0,0.92);
  display:flex; flex-direction:column;
}
.lightbox__close {
  position:absolute; top:var(--s-4); right:var(--s-4); z-index:10;
  background:none; border:none; color:#fff; font-size:28px;
  cursor:pointer; opacity:0.7; transition:opacity 0.15s;
  width:40px; height:40px; display:flex; align-items:center; justify-content:center;
}
.lightbox__close:hover { opacity:1; }
.lightbox__nav {
  position:absolute; top:50%; transform:translateY(-50%); z-index:10;
  background:none; border:none; color:#fff; font-size:48px;
  cursor:pointer; opacity:0.5; transition:opacity 0.15s;
  width:60px; height:80px; display:flex; align-items:center; justify-content:center;
}
.lightbox__nav:hover { opacity:1; }
.lightbox__nav--prev { left:var(--s-3); }
.lightbox__nav--next { right:var(--s-3); }
.lightbox__nav:disabled { opacity:0.15; cursor:default; }
.lightbox__main {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:var(--s-10) var(--s-12); min-height:0;
}
.lightbox__img {
  max-width:100%; max-height:100%; object-fit:contain;
  border-radius:var(--radius);
}
.lightbox__bar {
  display:flex; align-items:center; justify-content:space-between;
  padding:var(--s-3) var(--s-6);
  background:rgba(0,0,0,0.6);
  color:#fff; font-size:var(--font-sm);
  flex-shrink:0;
}
.lightbox__info { display:flex; gap:var(--s-4); align-items:center; }
.lightbox__actions { display:flex; gap:var(--s-3); }
.lightbox__actions .btn { color:#fff; border-color:rgba(255,255,255,0.3); }
.lightbox__actions .btn:hover { border-color:#fff; }
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);

      state = { section, offset, total: d.total ?? 0 };
      render_filter_options(d.sections ?? []);
      render_grid(d.items ?? []);
      render_pagination();
      countEl.textContent = `${state.total} 件`;
    } catch (err) {
      grid.querySelectorAll('.media-card').forEach(el => el.remove());
      emptyEl.style.display = '';
      countEl.textContent = '0 件';
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
    allItems = items;
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
        if (!res.ok || body.error) throw new Error(body.error ?? '削除に失敗しました');
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

  // ─ ライトボックス ─
  let allItems = []; // 現在表示中の全アイテム

  function open_modal(item) {
    currentItem = item;
    update_lightbox();
    modal.style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function update_lightbox() {
    if (!currentItem) return;
    const url = item_url(currentItem);
    document.getElementById('media-modal-img').src = url;
    document.getElementById('modal-filename').textContent = currentItem.filename || '';
    document.getElementById('modal-dims').textContent = currentItem.width && currentItem.height
      ? `${currentItem.width}×${currentItem.height}` : '';
    document.getElementById('modal-size').textContent = fmt_bytes(currentItem.size_bytes);

    const idx = allItems.indexOf(currentItem);
    document.getElementById('lightbox-prev').disabled = idx <= 0;
    document.getElementById('lightbox-next').disabled = idx < 0 || idx >= allItems.length - 1;
  }

  function navigate(dir) {
    const idx = allItems.indexOf(currentItem);
    const next = allItems[idx + dir];
    if (next) { currentItem = next; update_lightbox(); }
  }

  function close_modal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentItem = null;
  }

  document.getElementById('media-modal-close').addEventListener('click', close_modal);
  document.getElementById('lightbox-prev').addEventListener('click', () => navigate(-1));
  document.getElementById('lightbox-next').addEventListener('click', () => navigate(1));
  modal.addEventListener('click', e => { if (e.target === modal || e.target.classList.contains('lightbox__main')) close_modal(); });
  document.addEventListener('keydown', e => {
    if (!currentItem) return;
    if (e.key === 'Escape') close_modal();
    if (e.key === 'ArrowLeft')  navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  document.getElementById('modal-copy-btn').addEventListener('click', () => {
    if (currentItem) copy_url(item_url(currentItem));
  });
  document.getElementById('modal-delete-btn').addEventListener('click', () => {
    if (!currentItem) return;
    const card = grid.querySelector(`[data-path="${CSS.escape(currentItem.path)}"]`);
    const idx = allItems.indexOf(currentItem);
    delete_item(currentItem, card);
    allItems.splice(idx, 1);
    if (allItems.length === 0) { close_modal(); return; }
    currentItem = allItems[Math.min(idx, allItems.length - 1)];
    update_lightbox();
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
        if (!res.ok || body.error) throw new Error(body.error ?? 'アップロードに失敗しました');
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

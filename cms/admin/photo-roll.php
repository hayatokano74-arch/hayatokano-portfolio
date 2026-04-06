<?php
// Photo Roll 管理ページ — スマホからの写真アップロード + 一覧

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db   = get_db();
$rows = $db->query("SELECT * FROM photo_roll ORDER BY date DESC, time DESC, id DESC")->fetchAll();

$page_title = 'Photo Roll';
$active_nav = 'photo-roll';
ob_start();
?>

<div class="pr-toolbar">
  <label class="btn btn-primary" id="pr-upload-label">
    <input type="file" id="pr-upload-input" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
    + 写真をアップロード
  </label>
  <span class="pr-count"><?= count($rows) ?> 枚</span>
</div>

<div class="pr-upload-progress" id="pr-progress" style="display:none;">
  <div class="pr-progress-info">
    <span id="pr-progress-text">アップロード中…</span>
    <span id="pr-progress-pct">0%</span>
  </div>
  <div class="pr-progress-track"><div class="pr-progress-fill" id="pr-progress-fill"></div></div>
</div>

<?php if (empty($rows)): ?>
<p class="empty-state" style="padding:var(--s-12);">まだ写真がありません。</p>
<?php else: ?>
<div class="pr-grid" id="pr-grid">
  <?php foreach ($rows as $r):
    $src = fix_broken_unicode_url($r['src']);
    $is_pub = ($r['published'] ?? 1);
  ?>
  <div class="pr-item <?= $is_pub ? '' : 'is-unpublished' ?>" data-slug="<?= htmlspecialchars($r['slug'], ENT_QUOTES) ?>">
    <img src="<?= htmlspecialchars($src, ENT_QUOTES) ?>" alt="" loading="lazy">
    <div class="pr-item-info">
      <span class="pr-item-date"><?= htmlspecialchars($r['date'] . ' ' . substr($r['time'] ?? '', 0, 5), ENT_QUOTES) ?></span>
      <div class="pr-item-actions">
        <button type="button" class="pr-btn pr-toggle-pub" title="<?= $is_pub ? '非公開にする' : '公開する' ?>">
          <span class="pr-pub-dot <?= $is_pub ? 'is-on' : '' ?>"></span>
        </button>
        <button type="button" class="pr-btn pr-delete" title="削除">✕</button>
      </div>
    </div>
  </div>
  <?php endforeach; ?>
</div>
<?php endif; ?>

<style>
.pr-toolbar { display:flex; align-items:center; gap:var(--s-4); margin-bottom:var(--s-5); }
.pr-count { font-size:var(--font-sm); color:var(--text-3); }

.pr-upload-progress { padding:var(--s-3) var(--s-4); background:var(--card); border:1px solid var(--border); border-radius:var(--radius); margin-bottom:var(--s-4); }
.pr-progress-info { display:flex; justify-content:space-between; font-size:var(--font-sm); color:var(--text-2); margin-bottom:var(--s-2); }
.pr-progress-track { height:4px; background:var(--border); border-radius:2px; overflow:hidden; }
.pr-progress-fill { height:100%; background:var(--accent); width:0%; transition:width 0.2s; }

.pr-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));
  gap:var(--s-3);
}

.pr-item {
  position:relative; border-radius:var(--radius); overflow:hidden;
  background:var(--card); border:1px solid var(--border);
  transition:opacity 0.15s;
}
.pr-item.is-unpublished { opacity:0.4; }
.pr-item img { width:100%; aspect-ratio:1; object-fit:cover; display:block; }

.pr-item-info {
  display:flex; align-items:center; justify-content:space-between;
  padding:var(--s-2) var(--s-3); font-size:var(--font-xs);
}
.pr-item-date { color:var(--text-3); }
.pr-item-actions { display:flex; gap:var(--s-2); }

.pr-btn {
  all:unset; cursor:pointer; display:flex; align-items:center; justify-content:center;
  width:20px; height:20px; border-radius:4px; font-size:11px; color:var(--text-3);
  transition:color 0.15s;
}
.pr-btn:hover { color:var(--text); }
.pr-delete:hover { color:var(--danger); }

.pr-pub-dot { width:8px; height:8px; border-radius:50%; background:var(--text-3); transition:background 0.15s; }
.pr-pub-dot.is-on { background:var(--success); }

@media (max-width:768px) {
  .pr-grid { grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); }
}
</style>

<script>
(function() {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
  const API = '../api/photo-roll.php';

  // アップロード
  const uploadInput = document.getElementById('pr-upload-input');
  const progressEl = document.getElementById('pr-progress');
  const progressText = document.getElementById('pr-progress-text');
  const progressPct = document.getElementById('pr-progress-pct');
  const progressFill = document.getElementById('pr-progress-fill');

  uploadInput?.addEventListener('change', async function() {
    const files = Array.from(this.files || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    this.value = '';

    progressEl.style.display = '';
    let done = 0;

    for (const file of files) {
      progressText.textContent = `${done + 1} / ${files.length}: ${file.name}`;
      progressPct.textContent = '0%';
      progressFill.style.width = '0%';

      const fd = new FormData();
      fd.append('file', file);

      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
          body: fd,
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        show_toast(file.name + ' をアップロードしました', 'success');
      } catch (err) {
        show_toast(file.name + ': ' + err.message, 'error');
      }
      done++;
      progressFill.style.width = Math.round(done / files.length * 100) + '%';
      progressPct.textContent = Math.round(done / files.length * 100) + '%';
    }

    progressText.textContent = `${done} 枚のアップロード完了`;
    setTimeout(() => { progressEl.style.display = 'none'; location.reload(); }, 1500);
  });

  // 公開/非公開切替
  document.getElementById('pr-grid')?.addEventListener('click', async (e) => {
    const toggleBtn = e.target.closest('.pr-toggle-pub');
    if (toggleBtn) {
      const item = toggleBtn.closest('.pr-item');
      const slug = item.dataset.slug;
      const dot = toggleBtn.querySelector('.pr-pub-dot');
      const isOn = dot.classList.contains('is-on');

      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
          body: JSON.stringify({ slug, published: isOn ? 0 : 1 }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        dot.classList.toggle('is-on', !isOn);
        item.classList.toggle('is-unpublished', isOn);
        show_toast(isOn ? '非公開にしました' : '公開しました', 'success');
      } catch (err) { show_toast(err.message, 'error'); }
    }

    // 削除
    const deleteBtn = e.target.closest('.pr-delete');
    if (deleteBtn) {
      const item = deleteBtn.closest('.pr-item');
      const slug = item.dataset.slug;
      confirm_delete('この写真を削除しますか？', async () => {
        try {
          const res = await fetch(`${API}?slug=${encodeURIComponent(slug)}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': csrf },
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          item.remove();
          show_toast('削除しました', 'success');
        } catch (err) { show_toast(err.message, 'error'); }
      });
    }
  });
})();
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

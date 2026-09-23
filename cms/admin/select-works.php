<?php
// Select Works 一覧（Works のうち "Client" タグが付いた作品のみ）
// フロントの非公開ページ /select-works に表示される作品を管理する。

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db = get_db();
$all_rows = $db->query("SELECT id, slug, title, date, tags, pinned, published, data, updated_at FROM works ORDER BY pinned DESC, date DESC")->fetchAll();

// "Client" タグを持つ作品だけに絞り込む（タグはJSON配列で保存されている）
$rows = array_values(array_filter($all_rows, function ($row) {
    $tags = json_decode($row['tags'] ?? '[]', true) ?? [];
    return in_array('Client', $tags, true);
}));

$page_title = 'Select Works 一覧';
$active_nav = 'select-works';
ob_start();
?>

<p class="text-muted" style="margin: -8px 0 16px;">
  Works のうち <span class="badge badge--sm">Client</span> タグが付いた作品のみを表示しています。
  フロントの非公開ページ <code>/select-works</code>（メニュー非表示・リンクを知る人のみ閲覧可）に反映されます。
</p>

<div class="page-actions">
  <a href="<?= cms_url('/admin/works.php') ?>" class="btn btn-ghost btn-sm">← Works 一覧へ</a>
  <a href="<?= cms_url('/admin/works-edit.php?action=new&tags=' . urlencode('Client')) ?>" class="btn btn-primary">+ 新規追加（Client タグ付き）</a>
</div>

<?php if (empty($rows)): ?>
<p class="empty-state">Client タグの付いた Works がまだありません。Works 編集画面でタグに「Client」を追加すると、ここに表示されます。</p>
<?php else: ?>
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th style="width:56px"></th>
        <th>タイトル</th>
        <th style="width:50px">状態</th>
        <th>日付</th>
        <th>タグ</th>
        <th>更新</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $row): ?>
      <?php
        $edit_url  = cms_url('/admin/works-edit.php?slug=' . urlencode($row['slug']));
        $tags      = json_decode($row['tags'] ?? '[]', true) ?? [];
        $data      = json_decode($row['data'] ?? '{}', true) ?? [];
        $media     = $data['media'] ?? [];
        $thumb_src = '';
        if (!empty($data['thumbnail']['src'])) {
            $thumb_src = $data['thumbnail']['src'];
        } else {
            foreach ($media as $m) {
                if (($m['type'] ?? '') === 'image' && !empty($m['src'])) {
                    $thumb_src = $m['src'];
                    break;
                }
            }
        }
        if (!$thumb_src) {
            foreach ($media as $m) {
                if (($m['type'] ?? '') === 'video' && !empty($m['src']) && str_contains($m['src'], 'youtube')) {
                    if (preg_match('/[?&]v=([^&]+)/', $m['src'], $ym)) {
                        $thumb_src = 'https://img.youtube.com/vi/' . $ym[1] . '/hqdefault.jpg';
                    }
                    break;
                }
            }
        }
        $thumb_src = fix_broken_unicode_url($thumb_src);
      ?>
      <tr class="is-clickable" data-href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>"
          style="<?= ($row['published'] ?? 1) ? '' : 'opacity:0.4' ?>">
        <td>
          <?php if ($thumb_src): ?>
          <img src="<?= htmlspecialchars($thumb_src, ENT_QUOTES) ?>"
               alt="" width="48" height="36"
               style="object-fit:cover;border-radius:4px;display:block;">
          <?php else: ?>
          <div style="width:48px;height:36px;background:var(--surface);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--text-3);">✦</div>
          <?php endif; ?>
        </td>
        <td>
          <span style="font-weight:500;color:var(--text);"><?= htmlspecialchars($row['title'] ?: '（無題）', ENT_QUOTES) ?></span>
          <br><small class="text-muted"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></small>
        </td>
        <td>
          <button type="button" class="publish-toggle <?= ($row['published'] ?? 1) ? 'is-published' : '' ?>"
                  data-slug="<?= htmlspecialchars($row['slug'], ENT_QUOTES) ?>"
                  onclick="event.stopPropagation()"
                  title="<?= ($row['published'] ?? 1) ? '非公開にする' : '公開する' ?>">
            <span class="publish-dot"></span>
          </button>
        </td>
        <td class="text-muted"><?= htmlspecialchars($row['date'], ENT_QUOTES) ?></td>
        <td>
          <?php foreach ($tags as $tag): ?>
          <span class="badge badge--sm"><?= htmlspecialchars($tag, ENT_QUOTES) ?></span>
          <?php endforeach; ?>
        </td>
        <td class="text-muted" data-rel-time="<?= htmlspecialchars($row['updated_at'], ENT_QUOTES) ?>">
          <?= htmlspecialchars($row['updated_at'], ENT_QUOTES) ?>
        </td>
        <td>
          <a href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>" class="btn btn-sm btn-ghost" onclick="event.stopPropagation()">編集</a>
        </td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php endif; ?>

<style>
.publish-toggle {
  all: unset; cursor: pointer; display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
}
.publish-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--text-3); transition: background 0.15s;
}
.publish-toggle.is-published .publish-dot { background: var(--success); }
.publish-toggle:hover .publish-dot { opacity: 0.7; }
</style>

<script>
document.querySelectorAll('.publish-toggle').forEach(btn => {
  btn.addEventListener('click', async () => {
    const slug = btn.dataset.slug;
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
    try {
      const res = await fetch(`../api/works.php?toggle_publish=${encodeURIComponent(slug)}`, {
        headers: { 'X-CSRF-Token': csrf },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      btn.classList.toggle('is-published', !!data.published);
      btn.title = data.published ? '非公開にする' : '公開する';
      const row = btn.closest('tr');
      if (row) row.style.opacity = data.published ? '' : '0.4';
      show_toast(data.published ? '公開しました' : '非公開にしました', 'success');
    } catch (err) {
      show_toast(err.message, 'error');
    }
  });
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

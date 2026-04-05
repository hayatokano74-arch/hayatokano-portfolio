<?php
// Works 一覧

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db   = get_db();
$rows = $db->query("SELECT id, slug, title, date, tags, pinned, data, updated_at FROM works ORDER BY pinned DESC, date DESC")->fetchAll();

$page_title = 'Works 一覧';
$active_nav = 'works';
ob_start();
?>

<div class="page-actions">
  <a href="<?= cms_url('/admin/works-edit.php?action=new') ?>" class="btn btn-primary">+ 新規追加</a>
</div>

<?php if (empty($rows)): ?>
<p class="empty-state">まだ Works がありません。</p>
<?php else: ?>
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th style="width:56px"></th>
        <th>タイトル</th>
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
        // サムネイル: thumbnail → 最初の画像 → YouTubeサムネイル の順で探す
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
        // 画像がなければ動画（YouTube）のサムネイルを取得
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
      <tr class="is-clickable" data-href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>">
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
          <?php if ($row['pinned']): ?>
          <span class="badge badge--accent" style="margin-left:6px;font-size:10px;">固定</span>
          <?php endif; ?>
          <br><small class="slug-inline" data-slug="<?= htmlspecialchars($row['slug'], ENT_QUOTES) ?>"
                     title="クリックしてスラッグを編集"
                     style="color:var(--text-3);cursor:pointer;border-bottom:1px dashed var(--border);"
            ><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></small>
        </td>
        <td class="text-muted"><?= htmlspecialchars($row['date'], ENT_QUOTES) ?></td>
        <td>
          <?php foreach (array_slice($tags, 0, 3) as $tag): ?>
          <span class="badge badge--sm"><?= htmlspecialchars($tag, ENT_QUOTES) ?></span>
          <?php endforeach; ?>
          <?php if (count($tags) > 3): ?>
          <span class="text-muted" style="font-size:var(--font-xs);">+<?= count($tags) - 3 ?></span>
          <?php endif; ?>
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

<script>
// スラッグのインライン編集
document.querySelectorAll('.slug-inline').forEach(el => {
  el.addEventListener('click', (e) => {
    e.stopPropagation(); // 行クリック（編集ページ遷移）を防止
    const oldSlug = el.dataset.slug;
    const newSlug = prompt('スラッグを変更:', oldSlug);
    if (!newSlug || newSlug === oldSlug) return;
    const clean = newSlug.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (!clean) { alert('スラッグは英数字・ハイフン・アンダースコアのみです'); return; }

    // API経由で更新
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
    fetch('../api/works.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ _original_slug: oldSlug, slug: clean }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      el.textContent = clean;
      el.dataset.slug = clean;
      // 編集リンクも更新
      const row = el.closest('tr');
      if (row) row.dataset.href = row.dataset.href.replace(oldSlug, clean);
      show_toast('スラッグを変更しました', 'success');
    })
    .catch(err => show_toast(err.message, 'error'));
  });
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

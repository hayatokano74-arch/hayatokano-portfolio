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
        $thumb_src = fix_broken_unicode_url($media[0]['src'] ?? ($data['thumbnail']['src'] ?? ''));
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
          <br><small class="text-muted"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></small>
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

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

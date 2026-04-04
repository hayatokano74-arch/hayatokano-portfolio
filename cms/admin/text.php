<?php
// Text 一覧

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db   = get_db();
$rows = $db->query("SELECT id, slug, title, date, year, categories, updated_at FROM texts ORDER BY date DESC")->fetchAll();

$page_title = 'Text 一覧';
$active_nav = 'text';
ob_start();
?>

<div class="page-actions">
  <a href="<?= cms_url('/admin/text-edit.php?action=new') ?>" class="btn btn-primary">+ 新規追加</a>
</div>

<?php if (empty($rows)): ?>
<p class="empty-state">まだ Text 記事がありません。</p>
<?php else: ?>
<div class="table-wrapper">
  <table class="table">
    <thead>
      <tr>
        <th>タイトル</th>
        <th style="width:120px;">日付</th>
        <th>カテゴリ</th>
        <th style="width:110px;">更新</th>
        <th style="width:56px;"></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($rows as $row): ?>
      <?php
        $edit_url   = cms_url('/admin/text-edit.php?slug=' . urlencode($row['slug']));
        $categories = json_decode($row['categories'] ?? '[]', true) ?? [];
      ?>
      <tr class="is-clickable" data-href="<?= htmlspecialchars($edit_url, ENT_QUOTES) ?>">
        <td>
          <span style="font-weight:500;color:var(--text);"><?= htmlspecialchars($row['title'] ?: '（無題）', ENT_QUOTES) ?></span>
          <br><small class="text-muted"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></small>
        </td>
        <td class="text-muted"><?= htmlspecialchars($row['date'], ENT_QUOTES) ?></td>
        <td>
          <?php foreach ($categories as $cat): ?>
          <span class="badge badge--sm"><?= htmlspecialchars($cat, ENT_QUOTES) ?></span>
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

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

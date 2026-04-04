<?php
// Text 編集 — テキスト記事の新規作成・既存編集・削除を行うフォームページ

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db     = get_db();
$errors = [];
$is_new = false;
$row    = null;

// ── POST 処理 ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'CSRFトークンが不正です。ページを再読み込みしてください。';
    } else {
        $action = $_POST['_action'] ?? 'save';

        if ($action === 'delete') {
            $del_slug = trim($_POST['slug'] ?? '');
            if ($del_slug) {
                $db->prepare("DELETE FROM texts WHERE slug = ?")->execute([$del_slug]);
            }
            header('Location: ' . cms_url('/admin/text.php'));
            exit;
        }

        $slug  = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $date  = trim($_POST['date'] ?? '');
        $year  = trim($_POST['year'] ?? '');
        $body  = trim($_POST['body'] ?? '');

        $cats_raw  = trim($_POST['categories'] ?? '');
        $cats      = array_values(array_filter(array_map('trim', explode(',', $cats_raw))));
        $cats_json = json_encode($cats, JSON_UNESCAPED_UNICODE);

        $data_raw = trim($_POST['data'] ?? '{}');
        if ($data_raw !== '' && json_decode($data_raw) === null) {
            $errors[] = 'data が正しい JSON ではありません。';
        }
        $data_json = $data_raw !== '' ? $data_raw : '{}';

        if (!$slug)  $errors[] = 'スラッグは必須です。';
        if (!$title) $errors[] = 'タイトルは必須です。';
        if (!$date)  $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $existing = db_find_by_slug('texts', $slug);
            if ($existing) {
                $stmt = $db->prepare("UPDATE texts SET title=?, date=?, year=?, categories=?, body=?, data=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$title, $date, $year, $cats_json, $body, $data_json, $slug]);
            } else {
                $stmt = $db->prepare("INSERT INTO texts (slug, title, date, year, categories, body, data) VALUES (?,?,?,?,?,?,?)");
                $stmt->execute([$slug, $title, $date, $year, $cats_json, $body, $data_json]);
            }
            header('Location: ' . cms_url('/admin/text.php'));
            exit;
        }
    }
}

// ── GET: データ読み込み ──────────────────────────────────
$action_param = $_GET['action'] ?? '';
$slug_param   = $_GET['slug']   ?? '';

if ($action_param === 'new') {
    $is_new = true;
    $row = ['slug' => '', 'title' => '', 'date' => date('Y-m-d'), 'year' => date('Y'), 'categories' => '[]', 'body' => '', 'data' => '{}'];
} elseif ($slug_param) {
    $row = db_find_by_slug('texts', $slug_param);
    if (!$row) {
        $errors[] = '指定された Text 記事が見つかりません。';
        $row = ['slug' => $slug_param, 'title' => '', 'date' => '', 'year' => '', 'categories' => '[]', 'body' => '', 'data' => '{}'];
    }
} else {
    header('Location: ' . cms_url('/admin/text.php'));
    exit;
}

$f_slug  = htmlspecialchars($row['slug'] ?? '', ENT_QUOTES);
$f_title = htmlspecialchars($row['title'] ?? '', ENT_QUOTES);
$f_date  = htmlspecialchars($row['date'] ?? '', ENT_QUOTES);
$f_year  = htmlspecialchars($row['year'] ?? '', ENT_QUOTES);
$f_body  = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);

$cats_arr = json_decode($row['categories'] ?? '[]', true) ?? [];
$f_cats   = htmlspecialchars(implode(', ', $cats_arr), ENT_QUOTES);

$data_decoded = json_decode($row['data'] ?? '{}', true) ?? [];
$f_data       = htmlspecialchars(json_encode($data_decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), ENT_QUOTES);

$page_title = $is_new ? 'Text 新規追加' : 'Text 編集: ' . ($row['title'] ?: $row['slug']);
$active_nav = 'text';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="text-form">
  <input type="hidden" name="_csrf"   value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">
  <input type="hidden" name="_action" value="save">

  <div class="form-grid">

    <div class="form-section form-section--full">
      <h3 class="form-section__title">基本情報</h3>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="slug">スラッグ <span class="required">*</span></label>
          <input type="text" id="slug" name="slug" class="form-control"
                 value="<?= $f_slug ?>" pattern="[a-zA-Z0-9\-_]+" required
                 <?= !$is_new ? 'readonly' : '' ?>>
        </div>
        <div class="form-group">
          <label class="form-label" for="title">タイトル <span class="required">*</span></label>
          <input type="text" id="title" name="title" class="form-control" value="<?= $f_title ?>" required>
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="year">年</label>
          <input type="text" id="year" name="year" class="form-control" value="<?= $f_year ?>">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="categories">カテゴリ（カンマ区切り）</label>
        <input type="text" id="categories" name="categories" class="form-control"
               value="<?= $f_cats ?>" placeholder="例: essay, photography, 2024">
      </div>
    </div>

    <!-- 本文 -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="18"><?= $f_body ?></textarea>
      </div>
    </div>

    <!-- 追加データ JSON -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">追加データ（data JSON）</h3>
      <p class="form-hint">関連リンク・クレジット等の付加情報を JSON で記述します。</p>
      <div class="form-group">
        <textarea id="data" name="data" class="form-control form-control--code" rows="10"><?= $f_data ?></textarea>
      </div>
    </div>

  </div>

  <div class="form-actions">
    <a href="<?= cms_url('/admin/text.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger" data-delete
            data-message="「<?= htmlspecialchars($row['title'] ?: $row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。">
      削除
    </button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message, () => {
        document.getElementById('text-form').querySelector('[name="_action"]').value = 'delete';
        document.getElementById('text-form').submit();
      });
    });
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

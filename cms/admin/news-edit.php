<?php
// News 編集 — ニュース記事の新規作成・既存編集・削除を行うフォームページ

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
                $db->prepare("DELETE FROM news WHERE slug = ?")->execute([$del_slug]);
            }
            header('Location: ' . cms_url('/admin/news.php'));
            exit;
        }

        $slug  = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $date  = trim($_POST['date'] ?? '');
        $body  = trim($_POST['body'] ?? '');

        $image_raw = trim($_POST['image'] ?? '{}');
        if ($image_raw !== '' && json_decode($image_raw) === null) {
            $errors[] = 'image が正しい JSON ではありません。';
        }
        $data_json = json_encode(['image' => json_decode($image_raw, true) ?? []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!$slug)  $errors[] = 'スラッグは必須です。';
        if (!$title) $errors[] = 'タイトルは必須です。';
        if (!$date)  $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $existing = db_find_by_slug('news', $slug);
            if ($existing) {
                $stmt = $db->prepare("UPDATE news SET title=?, date=?, body=?, data=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$title, $date, $body, $data_json, $slug]);
            } else {
                $stmt = $db->prepare("INSERT INTO news (slug, title, date, body, data) VALUES (?,?,?,?,?)");
                $stmt->execute([$slug, $title, $date, $body, $data_json]);
            }
            header('Location: ' . cms_url('/admin/news.php'));
            exit;
        }
    }
}

// ── GET: データ読み込み ──────────────────────────────────
$action_param = $_GET['action'] ?? '';
$slug_param   = $_GET['slug']   ?? '';

if ($action_param === 'new') {
    $is_new = true;
    $row = ['slug' => '', 'title' => '', 'date' => date('Y-m-d'), 'body' => '', 'data' => '{}'];
} elseif ($slug_param) {
    $row = db_find_by_slug('news', $slug_param);
    if (!$row) {
        $errors[] = '指定された News が見つかりません。';
        $row = ['slug' => $slug_param, 'title' => '', 'date' => '', 'body' => '', 'data' => '{}'];
    }
} else {
    header('Location: ' . cms_url('/admin/news.php'));
    exit;
}

$f_slug  = htmlspecialchars($row['slug'] ?? '', ENT_QUOTES);
$f_title = htmlspecialchars($row['title'] ?? '', ENT_QUOTES);
$f_date  = htmlspecialchars($row['date'] ?? '', ENT_QUOTES);
$f_body  = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);

$data_decoded = json_decode($row['data'] ?? '{}', true) ?? [];
$image_arr    = $data_decoded['image'] ?? [];
$f_image      = htmlspecialchars(json_encode($image_arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), ENT_QUOTES);

$page_title = $is_new ? 'News 新規追加' : 'News 編集: ' . ($row['title'] ?: $row['slug']);
$active_nav = 'news';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="news-form">
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
      <div class="form-group">
        <label class="form-label" for="date">日付 <span class="required">*</span></label>
        <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
      </div>
    </div>

    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="14"><?= $f_body ?></textarea>
      </div>
    </div>

    <div class="form-section form-section--full">
      <h3 class="form-section__title">画像（image JSON）</h3>
      <div class="upload-zone" id="upload-zone-news" data-section="news" data-slug="<?= $f_slug ?>">
        <div class="upload-zone__inner">
          <p class="upload-zone__text">クリックまたはドラッグ&amp;ドロップで画像をアップロード</p>
          <p class="upload-zone__hint">JPEG / PNG / WebP / GIF（最大 20MB）</p>
        </div>
        <div class="upload-zone__preview" id="upload-preview-news"></div>
      </div>
      <div class="form-group" style="margin-top:var(--s-4)">
        <label class="form-label" for="image">image JSON</label>
        <textarea id="image" name="image" class="form-control form-control--code" rows="6"><?= $f_image ?></textarea>
      </div>
    </div>

  </div>

  <div class="form-actions">
    <a href="<?= cms_url('/admin/news.php') ?>" class="btn btn-ghost">キャンセル</a>
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
  const zone = document.getElementById('upload-zone-news');
  if (zone) {
    init_upload_zone(zone, {
      apiUrl: '../api/upload.php',
      section: 'news',
      slug: '<?= addslashes($row['slug'] ?? '') ?>',
      onUploaded(url, width, height) {
        // 画像 URL を image JSON に反映
        try {
          const ta  = document.getElementById('image');
          const obj = JSON.parse(ta.value || '{}');
          obj.src    = url;
          obj.width  = width  ?? obj.width;
          obj.height = height ?? obj.height;
          ta.value   = JSON.stringify(obj, null, 2);
        } catch (e) {
          document.getElementById('image').value = JSON.stringify({ src: url, width, height }, null, 2);
        }
        show_toast('画像をアップロードしました', 'success');
      },
    });
  }
  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message, () => {
        document.getElementById('news-form').querySelector('[name="_action"]').value = 'delete';
        document.getElementById('news-form').submit();
      });
    });
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

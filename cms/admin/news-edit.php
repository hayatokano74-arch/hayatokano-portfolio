<?php
// News 編集

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';
require_once dirname(__DIR__) . '/lib/revalidate.php';

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
                revalidate_paths(['/news']);
            }
            header('Location: ' . cms_url('/admin/news.php'));
            exit;
        }

        $slug  = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $title = trim($_POST['title'] ?? '');
        $date  = trim($_POST['date'] ?? '');
        $body  = trim($_POST['body'] ?? '');

        // 画像フィールド（構造化）
        $image = [
            'src'    => trim($_POST['image_src']    ?? ''),
            'alt'    => trim($_POST['image_alt']    ?? ''),
            'width'  => (int)($_POST['image_width']  ?? 0),
            'height' => (int)($_POST['image_height'] ?? 0),
        ];
        // 空なら空配列
        if ($image['src'] === '') $image = [];
        $data_json = json_encode(['image' => $image], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

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
            revalidate_paths(['/news']);
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
$f_img_src    = htmlspecialchars($image_arr['src']    ?? '', ENT_QUOTES);
$f_img_alt    = htmlspecialchars($image_arr['alt']    ?? '', ENT_QUOTES);
$f_img_w      = (int)($image_arr['width']  ?? 0);
$f_img_h      = (int)($image_arr['height'] ?? 0);

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

    <!-- ── 基本情報 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">基本情報</h3>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="slug">スラッグ <span class="required">*</span></label>
          <input type="text" id="slug" name="slug" class="form-control"
                 value="<?= $f_slug ?>" pattern="[a-zA-Z0-9\-_]+" required
                 <?= !$is_new ? 'readonly' : '' ?>>
          <?php if (!$is_new): ?><p class="form-hint">変更不可</p><?php endif; ?>
        </div>
        <div class="form-group">
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="title">タイトル <span class="required">*</span></label>
        <input type="text" id="title" name="title" class="form-control" value="<?= $f_title ?>" required>
      </div>
    </div>

    <!-- ── 本文 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="14"
                  data-rich-editor
                  placeholder="本文を入力..."><?= $f_body ?></textarea>
      </div>
    </div>

    <!-- ── 画像 ── -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">画像（任意）</h3>
      <div class="upload-zone" id="upload-zone-news">
        <div class="upload-zone__inner">
          <p class="upload-zone__text">クリックまたはドラッグ&amp;ドロップで画像をアップロード</p>
          <p class="upload-zone__hint">JPEG / PNG / WebP / GIF（最大 20MB）</p>
        </div>
        <div class="upload-zone__preview" id="upload-preview-news">
          <?php if ($f_img_src): ?>
          <img src="<?= $f_img_src ?>" alt="" style="max-width:200px;border-radius:4px;">
          <?php endif; ?>
        </div>
      </div>
      <div class="image-meta-fields">
        <div class="form-row form-row--2col">
          <div class="form-group">
            <label class="form-label" for="image_src">画像 URL</label>
            <input type="text" id="image_src" name="image_src" class="form-control"
                   data-upload-section="news" data-upload-slug="<?= $f_slug ?>"
                   value="<?= $f_img_src ?>" placeholder="/uploads/...">
          </div>
          <div class="form-group">
            <label class="form-label" for="image_alt">alt テキスト</label>
            <input type="text" id="image_alt" name="image_alt" class="form-control"
                   value="<?= $f_img_alt ?>">
          </div>
        </div>
        <div class="form-row form-row--2col">
          <div class="form-group">
            <label class="form-label">幅 (px)</label>
            <input type="number" name="image_width" class="form-control" value="<?= $f_img_w ?>" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">高さ (px)</label>
            <input type="number" name="image_height" class="form-control" value="<?= $f_img_h ?>" min="0">
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="form-actions">
    <a href="<?= cms_url('/admin/news.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger"
            data-delete
            data-message="「<?= htmlspecialchars($row['title'] ?: $row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。"
            data-form-action="delete"
            data-form-id="news-form">削除</button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // 画像アップロードゾーン
  const zone = document.getElementById('upload-zone-news');
  if (zone) {
    init_upload_zone(zone, {
      apiUrl: '../api/upload.php',
      section: 'news',
      slug: '<?= addslashes($row['slug'] ?? '') ?>',
      onUploaded(url, width, height) {
        document.getElementById('image_src').value = url;
        if (width)  document.querySelector('[name="image_width"]').value  = width;
        if (height) document.querySelector('[name="image_height"]').value = height;
        show_toast('画像をアップロードしました', 'success');
      },
    });
  }

  // 削除ボタン
  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message || '削除しますか？', () => {
        const form = document.getElementById('news-form');
        form.querySelector('[name="_action"]').value = 'delete';
        form.submit();
      });
    });
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

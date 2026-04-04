<?php
// Timeline 編集 — タイムラインエントリの新規作成・既存編集・削除を行うフォームページ

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
                $db->prepare("DELETE FROM timeline WHERE slug = ?")->execute([$del_slug]);
            }
            header('Location: ' . cms_url('/admin/timeline.php'));
            exit;
        }

        $slug     = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $date     = trim($_POST['date'] ?? '');
        $time_val = trim($_POST['time_val'] ?? '');
        $type     = in_array($_POST['type'] ?? '', ['text', 'photo']) ? $_POST['type'] : 'text';
        $body     = trim($_POST['body'] ?? '');

        $images_raw = trim($_POST['images'] ?? '[]');
        if ($images_raw !== '' && json_decode($images_raw) === null) {
            $errors[] = 'images が正しい JSON ではありません。';
        }
        $images_json = $images_raw !== '' ? $images_raw : '[]';

        if (!$slug) $errors[] = 'スラッグは必須です。';
        if (!$date) $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $existing = db_find_by_slug('timeline', $slug);
            if ($existing) {
                $stmt = $db->prepare("UPDATE timeline SET date=?, time_val=?, type=?, images=?, body=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$date, $time_val, $type, $images_json, $body, $slug]);
            } else {
                $stmt = $db->prepare("INSERT INTO timeline (slug, date, time_val, type, images, body) VALUES (?,?,?,?,?,?)");
                $stmt->execute([$slug, $date, $time_val, $type, $images_json, $body]);
            }
            header('Location: ' . cms_url('/admin/timeline.php'));
            exit;
        }
    }
}

// ── GET: データ読み込み ──────────────────────────────────
$action_param = $_GET['action'] ?? '';
$slug_param   = $_GET['slug']   ?? '';

if ($action_param === 'new') {
    $is_new = true;
    $now    = new DateTime();
    $row = [
        'slug'     => '',
        'date'     => $now->format('Y-m-d'),
        'time_val' => $now->format('H:i'),
        'type'     => 'text',
        'images'   => '[]',
        'body'     => '',
    ];
} elseif ($slug_param) {
    $row = db_find_by_slug('timeline', $slug_param);
    if (!$row) {
        $errors[] = '指定された Timeline エントリが見つかりません。';
        $row = ['slug' => $slug_param, 'date' => '', 'time_val' => '', 'type' => 'text', 'images' => '[]', 'body' => ''];
    }
} else {
    header('Location: ' . cms_url('/admin/timeline.php'));
    exit;
}

$f_slug     = htmlspecialchars($row['slug'] ?? '', ENT_QUOTES);
$f_date     = htmlspecialchars($row['date'] ?? '', ENT_QUOTES);
$f_time_val = htmlspecialchars($row['time_val'] ?? '', ENT_QUOTES);
$f_type     = $row['type'] ?? 'text';
$f_body     = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);

$images_arr = json_decode($row['images'] ?? '[]', true) ?? [];
$f_images   = htmlspecialchars(json_encode($images_arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), ENT_QUOTES);

$page_title = $is_new ? 'Timeline 新規追加' : 'Timeline 編集: ' . $row['slug'];
$active_nav = 'timeline';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="timeline-form">
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
          <label class="form-label" for="type">タイプ</label>
          <select id="type" name="type" class="form-control" id="tl-type">
            <option value="text"  <?= $f_type === 'text'  ? 'selected' : '' ?>>text</option>
            <option value="photo" <?= $f_type === 'photo' ? 'selected' : '' ?>>photo</option>
          </select>
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="time_val">時刻（HH:MM）</label>
          <input type="time" id="time_val" name="time_val" class="form-control" value="<?= $f_time_val ?>">
        </div>
      </div>
    </div>

    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="12"><?= $f_body ?></textarea>
      </div>
    </div>

    <!-- 画像アップロードゾーン -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">画像アップロード</h3>
      <div class="upload-zone" id="upload-zone-tl" data-section="timeline" data-slug="<?= $f_slug ?>">
        <div class="upload-zone__inner">
          <p class="upload-zone__text">クリックまたはドラッグ&amp;ドロップで画像をアップロード</p>
          <p class="upload-zone__hint">JPEG / PNG / WebP / GIF（最大 20MB）</p>
        </div>
        <div class="upload-zone__preview" id="upload-preview-tl"></div>
      </div>
      <div class="form-group" style="margin-top:var(--s-4)">
        <label class="form-label" for="images">images JSON</label>
        <textarea id="images" name="images" class="form-control form-control--code" rows="8"><?= $f_images ?></textarea>
      </div>
    </div>

  </div>

  <div class="form-actions">
    <a href="<?= cms_url('/admin/timeline.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger" data-delete
            data-message="「<?= htmlspecialchars($row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。">
      削除
    </button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('upload-zone-tl');
  if (zone) {
    init_upload_zone(zone, {
      apiUrl: '../api/upload.php',
      section: 'timeline',
      slug: '<?= addslashes($row['slug'] ?? '') ?>',
      onUploaded(url, width, height) {
        // images JSON 配列に追記
        try {
          const ta  = document.getElementById('images');
          const arr = JSON.parse(ta.value || '[]');
          arr.push({ src: url, width: width ?? 0, height: height ?? 0, alt: '' });
          ta.value = JSON.stringify(arr, null, 2);
        } catch (e) {
          show_toast('アップロード完了: ' + url, 'info');
          return;
        }
        show_toast('画像を追加しました', 'success');
      },
    });
  }

  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      confirm_delete(delBtn.dataset.message, () => {
        document.getElementById('timeline-form').querySelector('[name="_action"]').value = 'delete';
        document.getElementById('timeline-form').submit();
      });
    });
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

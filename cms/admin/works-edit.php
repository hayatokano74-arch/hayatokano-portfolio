<?php
// Works 編集 — Works の新規作成・既存編集・削除を行うフォームページ

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db     = get_db();
$errors = [];
$notice = '';
$is_new = false;
$row    = null;

// ── POST 処理 ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'CSRFトークンが不正です。ページを再読み込みしてください。';
    } else {
        $action = $_POST['_action'] ?? 'save';

        if ($action === 'delete') {
            // 削除処理
            $del_slug = trim($_POST['slug'] ?? '');
            if ($del_slug) {
                $db->prepare("DELETE FROM works WHERE slug = ?")->execute([$del_slug]);
            }
            header('Location: ' . cms_url('/admin/works.php'));
            exit;
        }

        // 保存処理
        $slug   = preg_replace('/[^a-zA-Z0-9\-_]/', '', trim($_POST['slug'] ?? ''));
        $title  = trim($_POST['title'] ?? '');
        $date   = trim($_POST['date'] ?? '');
        $year   = trim($_POST['year'] ?? '');
        $excerpt = trim($_POST['excerpt'] ?? '');
        $pinned = isset($_POST['pinned']) ? 1 : 0;
        $body   = trim($_POST['body'] ?? '');

        // タグを JSON 配列に変換
        $tags_raw = trim($_POST['tags'] ?? '');
        $tags = array_values(array_filter(array_map('trim', explode(',', $tags_raw))));
        $tags_json = json_encode($tags, JSON_UNESCAPED_UNICODE);

        // サムネイル情報
        $thumb = [
            'src'    => trim($_POST['thumbnail_src'] ?? ''),
            'alt'    => trim($_POST['thumbnail_alt'] ?? ''),
            'width'  => (int)($_POST['thumbnail_width'] ?? 0),
            'height' => (int)($_POST['thumbnail_height'] ?? 0),
        ];

        // details / media JSON
        $details_raw = trim($_POST['details'] ?? '{}');
        $media_raw   = trim($_POST['media'] ?? '[]');

        // JSON 検証
        if ($details_raw !== '' && json_decode($details_raw) === null) {
            $errors[] = 'details が正しい JSON ではありません。';
        }
        if ($media_raw !== '' && json_decode($media_raw) === null) {
            $errors[] = 'media が正しい JSON ではありません。';
        }

        // data フィールドに統合
        $data_arr = [
            'thumbnail' => $thumb,
            'details'   => json_decode($details_raw, true) ?? [],
            'media'     => json_decode($media_raw, true) ?? [],
        ];
        $data_json = json_encode($data_arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (!$slug)  $errors[] = 'スラッグは必須です。';
        if (!$title) $errors[] = 'タイトルは必須です。';
        if (!$date)  $errors[] = '日付は必須です。';

        if (empty($errors)) {
            $existing = db_find_by_slug('works', $slug);

            if ($existing) {
                // 更新
                $stmt = $db->prepare("UPDATE works SET title=?, date=?, year=?, tags=?, excerpt=?, pinned=?, body=?, data=?, updated_at=datetime('now') WHERE slug=?");
                $stmt->execute([$title, $date, $year, $tags_json, $excerpt, $pinned, $body, $data_json, $slug]);
            } else {
                // 新規
                $stmt = $db->prepare("INSERT INTO works (slug, title, date, year, tags, excerpt, pinned, body, data) VALUES (?,?,?,?,?,?,?,?,?)");
                $stmt->execute([$slug, $title, $date, $year, $tags_json, $excerpt, $pinned, $body, $data_json]);
            }

            header('Location: ' . cms_url('/admin/works.php'));
            exit;
        }
    }
}

// ── GET: データ読み込み ──────────────────────────────────
$action_param = $_GET['action'] ?? '';
$slug_param   = $_GET['slug']   ?? '';

if ($action_param === 'new') {
    $is_new = true;
    $row = [
        'slug' => '', 'title' => '', 'date' => date('Y-m-d'), 'year' => date('Y'),
        'tags' => '[]', 'excerpt' => '', 'pinned' => 0, 'body' => '',
        'data' => '{}',
    ];
} elseif ($slug_param) {
    $row = db_find_by_slug('works', $slug_param);
    if (!$row) {
        $errors[] = '指定された Works が見つかりません。';
        $row = ['slug' => $slug_param, 'title' => '', 'date' => '', 'year' => '', 'tags' => '[]', 'excerpt' => '', 'pinned' => 0, 'body' => '', 'data' => '{}'];
    }
} else {
    header('Location: ' . cms_url('/admin/works.php'));
    exit;
}

// フォーム用データの準備
$f_slug    = htmlspecialchars($row['slug'] ?? '', ENT_QUOTES);
$f_title   = htmlspecialchars($row['title'] ?? '', ENT_QUOTES);
$f_date    = htmlspecialchars($row['date'] ?? '', ENT_QUOTES);
$f_year    = htmlspecialchars($row['year'] ?? '', ENT_QUOTES);
$f_excerpt = htmlspecialchars($row['excerpt'] ?? '', ENT_QUOTES);
$f_pinned  = !empty($row['pinned']);
$f_body    = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);

$data_decoded = json_decode($row['data'] ?? '{}', true) ?? [];
$thumb        = $data_decoded['thumbnail'] ?? [];
$f_thumb_src  = htmlspecialchars($thumb['src'] ?? '', ENT_QUOTES);
$f_thumb_alt  = htmlspecialchars($thumb['alt'] ?? '', ENT_QUOTES);
$f_thumb_w    = (int)($thumb['width'] ?? 0);
$f_thumb_h    = (int)($thumb['height'] ?? 0);

$tags_arr  = json_decode($row['tags'] ?? '[]', true) ?? [];
$f_tags    = htmlspecialchars(implode(', ', $tags_arr), ENT_QUOTES);

$details_arr = $data_decoded['details'] ?? [];
$f_details   = htmlspecialchars(json_encode($details_arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), ENT_QUOTES);

$media_arr = $data_decoded['media'] ?? [];
$f_media   = htmlspecialchars(json_encode($media_arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), ENT_QUOTES);

$page_title = $is_new ? 'Works 新規追加' : 'Works 編集: ' . ($row['title'] ?: $row['slug']);
$active_nav = 'works';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="works-form">
  <input type="hidden" name="_csrf"   value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">
  <input type="hidden" name="_action" value="save">

  <div class="form-grid">

    <!-- 基本情報 -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">基本情報</h3>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="slug">スラッグ <span class="required">*</span></label>
          <input type="text" id="slug" name="slug" class="form-control"
                 value="<?= $f_slug ?>"
                 pattern="[a-zA-Z0-9\-_]+"
                 title="英数字・ハイフン・アンダースコアのみ"
                 required
                 <?= !$is_new ? 'readonly' : '' ?>>
          <?php if (!$is_new): ?>
          <p class="form-hint">スラッグは変更できません。</p>
          <?php endif; ?>
        </div>
        <div class="form-group">
          <label class="form-label" for="title">タイトル <span class="required">*</span></label>
          <input type="text" id="title" name="title" class="form-control" value="<?= $f_title ?>" required>
        </div>
      </div>

      <div class="form-row form-row--3col">
        <div class="form-group">
          <label class="form-label" for="date">日付 <span class="required">*</span></label>
          <input type="date" id="date" name="date" class="form-control" value="<?= $f_date ?>" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="year">年</label>
          <input type="text" id="year" name="year" class="form-control" value="<?= $f_year ?>" placeholder="例: 2024">
        </div>
        <div class="form-group form-group--center">
          <label class="form-label">固定表示</label>
          <label class="toggle-label">
            <input type="checkbox" name="pinned" <?= $f_pinned ? 'checked' : '' ?>>
            <span>トップに固定</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="tags">タグ（カンマ区切り）</label>
        <input type="text" id="tags" name="tags" class="form-control" value="<?= $f_tags ?>" placeholder="例: photography, portrait, 2024">
      </div>

      <div class="form-group">
        <label class="form-label" for="excerpt">抜粋 <span class="char-hint">(200字)</span></label>
        <textarea id="excerpt" name="excerpt" class="form-control" rows="3"
                  data-max-chars="200"><?= $f_excerpt ?></textarea>
      </div>
    </div>

    <!-- 本文 -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文</h3>
      <div class="form-group">
        <label class="form-label" for="body">body（HTML / Markdown）</label>
        <textarea id="body" name="body" class="form-control form-control--large" rows="12"><?= $f_body ?></textarea>
      </div>
    </div>

    <!-- サムネイル -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">サムネイル</h3>

      <!-- 画像アップロードゾーン -->
      <div class="upload-zone" id="upload-zone-thumb" data-section="works" data-slug="<?= $f_slug ?>">
        <div class="upload-zone__inner">
          <p class="upload-zone__text">クリックまたはドラッグ&amp;ドロップで画像をアップロード</p>
          <p class="upload-zone__hint">JPEG / PNG / WebP / GIF（最大 20MB）</p>
        </div>
        <div class="upload-zone__preview" id="upload-preview-thumb"></div>
      </div>

      <div class="form-row form-row--2col" style="margin-top:var(--s-4)">
        <div class="form-group">
          <label class="form-label" for="thumbnail_src">画像 URL</label>
          <input type="text" id="thumbnail_src" name="thumbnail_src" class="form-control" value="<?= $f_thumb_src ?>" placeholder="/uploads/...">
        </div>
        <div class="form-group">
          <label class="form-label" for="thumbnail_alt">alt テキスト</label>
          <input type="text" id="thumbnail_alt" name="thumbnail_alt" class="form-control" value="<?= $f_thumb_alt ?>">
        </div>
      </div>
      <div class="form-row form-row--2col">
        <div class="form-group">
          <label class="form-label" for="thumbnail_width">幅 (px)</label>
          <input type="number" id="thumbnail_width" name="thumbnail_width" class="form-control" value="<?= $f_thumb_w ?>" min="0">
        </div>
        <div class="form-group">
          <label class="form-label" for="thumbnail_height">高さ (px)</label>
          <input type="number" id="thumbnail_height" name="thumbnail_height" class="form-control" value="<?= $f_thumb_h ?>" min="0">
        </div>
      </div>
    </div>

    <!-- 詳細情報（JSON） -->
    <div class="form-section">
      <h3 class="form-section__title">展示情報（details JSON）</h3>
      <div class="form-group">
        <textarea id="details" name="details" class="form-control form-control--code" rows="10"><?= $f_details ?></textarea>
      </div>
    </div>

    <!-- メディア配列（JSON） -->
    <div class="form-section">
      <h3 class="form-section__title">メディア配列（media JSON）</h3>
      <div class="form-group">
        <textarea id="media" name="media" class="form-control form-control--code" rows="10"><?= $f_media ?></textarea>
      </div>
    </div>

  </div><!-- /.form-grid -->

  <!-- フォームアクション -->
  <div class="form-actions">
    <a href="<?= cms_url('/admin/works.php') ?>" class="btn btn-ghost">キャンセル</a>
    <?php if (!$is_new && $row): ?>
    <button type="button" class="btn btn-danger"
            data-delete
            data-message="「<?= htmlspecialchars($row['title'] ?: $row['slug'], ENT_QUOTES) ?>」を削除しますか？この操作は元に戻せません。"
            data-form-action="delete"
            data-form-id="works-form">
      削除
    </button>
    <?php endif; ?>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // 画像アップロードゾーン初期化
  const zone = document.getElementById('upload-zone-thumb');
  if (zone) {
    init_upload_zone(zone, {
      apiUrl: '../api/upload.php',
      section: 'works',
      slug: '<?= addslashes($row['slug'] ?? '') ?>',
      onUploaded(url, width, height) {
        document.getElementById('thumbnail_src').value    = url;
        document.getElementById('thumbnail_width').value  = width  ?? '';
        document.getElementById('thumbnail_height').value = height ?? '';
        show_toast('画像をアップロードしました', 'success');
      },
    });
  }

  // 削除ボタン
  const delBtn = document.querySelector('[data-delete]');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      const msg = delBtn.dataset.message || '削除しますか？';
      confirm_delete(msg, () => {
        const form = document.getElementById('works-form');
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

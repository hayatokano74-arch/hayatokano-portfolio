<?php
// About 編集 — About の単一レコードを編集するページ（photos・CV・body を管理する）

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db     = get_db();
$errors = [];
$notice = '';

// ── POST 処理 ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'CSRFトークンが不正です。ページを再読み込みしてください。';
    } else {
        $body        = trim($_POST['body'] ?? '');
        $photos_raw  = trim($_POST['photos'] ?? '[]');
        $cv_raw      = trim($_POST['cv'] ?? '{}');

        if (json_decode($photos_raw) === null) {
            $errors[] = 'photos が正しい JSON ではありません。';
        }
        if (json_decode($cv_raw) === null) {
            $errors[] = 'cv が正しい JSON ではありません。';
        }

        if (empty($errors)) {
            $data_arr  = [
                'photos' => json_decode($photos_raw, true) ?? [],
                'cv'     => json_decode($cv_raw, true) ?? [],
            ];
            $data_json = json_encode($data_arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $stmt = $db->prepare("UPDATE about SET body=?, data=?, updated_at=datetime('now') WHERE id=1");
            $stmt->execute([$body, $data_json]);

            $notice = '保存しました。';
        }
    }
}

// ── データ読み込み ──────────────────────────────────────
$row = db_find_by_id('about', 1);
if (!$row) {
    // フォールバック（マイグレーション未実行の場合）
    $row = ['id' => 1, 'body' => '', 'data' => '{}', 'updated_at' => ''];
}

$f_body      = htmlspecialchars($row['body'] ?? '', ENT_QUOTES);
$data_decoded = json_decode($row['data'] ?? '{}', true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log('[CMS] about data JSON デコードエラー: ' . json_last_error_msg());
}
$data_decoded = is_array($data_decoded) ? $data_decoded : [];

$photos_arr  = $data_decoded['photos'] ?? [];
$f_photos    = htmlspecialchars(json_encode($photos_arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), ENT_QUOTES);

$cv_arr      = $data_decoded['cv'] ?? [];
$f_cv        = htmlspecialchars(json_encode($cv_arr, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), ENT_QUOTES);

$page_title = 'About 編集';
$active_nav = 'about';
ob_start();
?>

<?php if (!empty($errors)): ?>
<div class="alert alert-error">
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e, ENT_QUOTES) ?></li><?php endforeach; ?></ul>
</div>
<?php endif; ?>

<?php if ($notice): ?>
<div class="alert alert-success" id="save-notice"><?= htmlspecialchars($notice, ENT_QUOTES) ?></div>
<script>
  // 保存成功後はトースト通知も出す
  document.addEventListener('DOMContentLoaded', () => {
    show_toast('<?= addslashes($notice) ?>', 'success');
  });
</script>
<?php endif; ?>

<form method="post" action="" class="edit-form" id="about-form">
  <input type="hidden" name="_csrf" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">

  <div class="form-grid">

    <!-- 本文 -->
    <div class="form-section form-section--full">
      <h3 class="form-section__title">本文（body）</h3>
      <div class="form-group">
        <textarea id="body" name="body" class="form-control form-control--large" rows="10"
                  data-rich-editor><?= $f_body ?></textarea>
      </div>
    </div>

    <!-- Photos JSON -->
    <div class="form-section">
      <h3 class="form-section__title">Photos（写真配列 JSON）</h3>
      <p class="form-hint">プロフィール写真などの配列。<code>{ src, alt, width, height }</code> の配列で記述します。</p>
      <div class="upload-zone" id="upload-zone-about" data-section="about" data-slug="about">
        <div class="upload-zone__inner">
          <p class="upload-zone__text">クリックまたはドラッグ&amp;ドロップで画像をアップロード</p>
          <p class="upload-zone__hint">JPEG / PNG / WebP / GIF（最大 20MB）</p>
        </div>
        <div class="upload-zone__preview" id="upload-preview-about"></div>
      </div>
      <div class="form-group" style="margin-top:var(--s-4)">
        <label class="form-label" for="photos">photos JSON</label>
        <textarea id="photos" name="photos" class="form-control form-control--code" rows="12"><?= $f_photos ?></textarea>
      </div>
    </div>

    <!-- CV JSON -->
    <div class="form-section">
      <h3 class="form-section__title">CV（経歴・受賞歴 JSON）</h3>
      <p class="form-hint">年代別の経歴データ。<code>{ year, items: [] }</code> の形式を推奨します。</p>
      <div class="form-group">
        <label class="form-label" for="cv">cv JSON</label>
        <textarea id="cv" name="cv" class="form-control form-control--code" rows="20"><?= $f_cv ?></textarea>
      </div>
    </div>

  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary">保存</button>
  </div>

</form>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('upload-zone-about');
  if (zone) {
    init_upload_zone(zone, {
      section: 'about',
      slug: 'about',
      onUploaded(url, width, height) {
        // photos 配列に追記
        try {
          const ta     = document.getElementById('photos');
          const arr    = JSON.parse(ta.value || '[]');
          arr.push({ src: url, alt: '', width: width ?? 0, height: height ?? 0 });
          ta.value = JSON.stringify(arr, null, 2);
        } catch (e) {
          // パース失敗時は URL をトーストで通知
        }
        show_toast('画像をアップロードしました: ' + url, 'success');
      },
    });
  }
});
</script>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

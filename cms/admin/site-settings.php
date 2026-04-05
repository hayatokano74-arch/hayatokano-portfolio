<?php
// サイト設定ページ

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db = get_db();

// 設定キーとデフォルト値
$setting_defs = [
    'site_name'        => ['label' => 'サイト名', 'default' => 'Hayato Kano', 'type' => 'text'],
    'site_description'  => ['label' => 'サイト説明', 'default' => '', 'type' => 'text'],
    'contact_email'    => ['label' => '連絡先メール', 'default' => 'info@hayatokano.com', 'type' => 'email'],
    'social_instagram' => ['label' => 'Instagram URL', 'default' => '', 'type' => 'url'],
    'social_x'         => ['label' => 'X (Twitter) URL', 'default' => '', 'type' => 'url'],
    'social_website'   => ['label' => 'ウェブサイト URL', 'default' => 'https://hayatokano.com', 'type' => 'url'],
    'works_per_page'   => ['label' => 'Works 1ページあたりの表示数', 'default' => '15', 'type' => 'number'],
    'garden_per_page'  => ['label' => 'Garden 1ページあたりの表示数', 'default' => '15', 'type' => 'number'],
    'og_image'         => ['label' => 'OGP画像 URL', 'default' => '', 'type' => 'url'],
    'analytics_id'     => ['label' => 'Google Analytics ID', 'default' => '', 'type' => 'text', 'placeholder' => 'G-XXXXXXXXXX'],
];

// POST: 保存
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf()) {
        $errors[] = 'CSRFトークンが不正です。';
    } else {
        foreach ($setting_defs as $key => $def) {
            $val = trim($_POST[$key] ?? '');
            $stmt = $db->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
            $stmt->execute([$key, json_encode($val, JSON_UNESCAPED_UNICODE)]);
        }
        header('Location: ' . cms_url('/admin/site-settings.php?saved=1'));
        exit;
    }
}

// GET: 読み込み
$values = [];
foreach ($setting_defs as $key => $def) {
    $stmt = $db->prepare('SELECT value FROM settings WHERE key = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    if ($row) {
        $decoded = json_decode($row['value'], true);
        $values[$key] = is_string($decoded) ? $decoded : ($row['value'] ?? '');
    } else {
        $values[$key] = $def['default'];
    }
}

$page_title = 'サイト設定';
$active_nav = 'settings';
ob_start();
?>

<?php if (!empty($_GET['saved'])): ?>
<div class="alert alert-success">設定を保存しました。</div>
<?php endif; ?>

<form method="post" action="">
  <input type="hidden" name="_csrf" value="<?= htmlspecialchars(csrf_token(), ENT_QUOTES) ?>">

  <!-- 基本情報 -->
  <div class="form-section form-section--full">
    <h3 class="form-section__title">基本情報</h3>
    <?php foreach (['site_name', 'site_description', 'contact_email'] as $key): ?>
    <div class="form-group">
      <label class="form-label" for="<?= $key ?>"><?= $setting_defs[$key]['label'] ?></label>
      <input type="<?= $setting_defs[$key]['type'] ?>" id="<?= $key ?>" name="<?= $key ?>"
             class="form-control" value="<?= htmlspecialchars($values[$key], ENT_QUOTES) ?>"
             placeholder="<?= htmlspecialchars($setting_defs[$key]['placeholder'] ?? '', ENT_QUOTES) ?>">
    </div>
    <?php endforeach; ?>
  </div>

  <!-- SNS -->
  <div class="form-section form-section--full">
    <h3 class="form-section__title">SNS・リンク</h3>
    <?php foreach (['social_instagram', 'social_x', 'social_website'] as $key): ?>
    <div class="form-group">
      <label class="form-label" for="<?= $key ?>"><?= $setting_defs[$key]['label'] ?></label>
      <input type="<?= $setting_defs[$key]['type'] ?>" id="<?= $key ?>" name="<?= $key ?>"
             class="form-control" value="<?= htmlspecialchars($values[$key], ENT_QUOTES) ?>"
             placeholder="https://...">
    </div>
    <?php endforeach; ?>
  </div>

  <!-- 表示設定 -->
  <div class="form-section form-section--full">
    <h3 class="form-section__title">表示設定</h3>
    <div class="form-row form-row--2col">
      <?php foreach (['works_per_page', 'garden_per_page'] as $key): ?>
      <div class="form-group">
        <label class="form-label" for="<?= $key ?>"><?= $setting_defs[$key]['label'] ?></label>
        <input type="number" id="<?= $key ?>" name="<?= $key ?>"
               class="form-control" value="<?= htmlspecialchars($values[$key], ENT_QUOTES) ?>"
               min="1" max="100">
      </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- SEO・アナリティクス -->
  <div class="form-section form-section--full">
    <h3 class="form-section__title">SEO・アナリティクス</h3>
    <?php foreach (['og_image', 'analytics_id'] as $key): ?>
    <div class="form-group">
      <label class="form-label" for="<?= $key ?>"><?= $setting_defs[$key]['label'] ?></label>
      <input type="<?= $setting_defs[$key]['type'] ?>" id="<?= $key ?>" name="<?= $key ?>"
             class="form-control" value="<?= htmlspecialchars($values[$key], ENT_QUOTES) ?>"
             placeholder="<?= htmlspecialchars($setting_defs[$key]['placeholder'] ?? '', ENT_QUOTES) ?>">
    </div>
    <?php endforeach; ?>
  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary">保存</button>
  </div>
</form>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

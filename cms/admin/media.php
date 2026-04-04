<?php
// メディア一覧 — アップロード済み画像をグリッド表示し、URL コピーやセクションフィルターを提供する

require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/lib/db.php';
require_once dirname(__DIR__) . '/lib/auth.php';
require_once dirname(__DIR__) . '/lib/response.php';

require_auth();

$db = get_db();

// セクション一覧を取得（フィルター用）
$sections = $db->query("SELECT DISTINCT section FROM media WHERE section != '' ORDER BY section ASC")->fetchColumn();
$sections = $db->query("SELECT DISTINCT section FROM media WHERE section != '' ORDER BY section ASC")->fetchAll(PDO::FETCH_COLUMN);

// フィルターパラメータ
$filter_section = trim($_GET['section'] ?? '');

// クエリ構築
if ($filter_section !== '') {
    $stmt = $db->prepare("SELECT * FROM media WHERE section = ? ORDER BY created_at DESC");
    $stmt->execute([$filter_section]);
} else {
    $stmt = $db->query("SELECT * FROM media ORDER BY created_at DESC");
}
$items = $stmt->fetchAll();

// ファイルサイズを人間が読みやすい形式に変換するヘルパー
function format_bytes(int $bytes): string {
    if ($bytes < 1024)       return $bytes . ' B';
    if ($bytes < 1024 * 1024) return round($bytes / 1024, 1) . ' KB';
    return round($bytes / (1024 * 1024), 1) . ' MB';
}

$page_title = 'メディア一覧';
$active_nav = 'media';
ob_start();
?>

<div class="page-actions">
  <!-- セクションフィルター -->
  <form method="get" action="" class="search-form">
    <select name="section" class="form-control" onchange="this.form.submit()">
      <option value="">すべてのセクション</option>
      <?php foreach ($sections as $sec): ?>
      <option value="<?= htmlspecialchars($sec, ENT_QUOTES) ?>" <?= $filter_section === $sec ? 'selected' : '' ?>>
        <?= htmlspecialchars($sec, ENT_QUOTES) ?>
      </option>
      <?php endforeach; ?>
    </select>
  </form>
  <span class="page-actions__count"><?= count($items) ?> 件</span>
</div>

<?php if (empty($items)): ?>
<p class="empty-state">まだ画像がアップロードされていません。</p>
<?php else: ?>
<div class="media-grid" id="media-grid">
  <?php foreach ($items as $item): ?>
  <?php
    // 公開 URL を生成
    $pub_url = UPLOAD_URL_PREFIX . '/' . ltrim($item['path'], '/');
    // uploads/ からの相対パスに変換
    if (str_starts_with($item['path'], '/')) {
        // path が絶対パスの場合 UPLOAD_DIR からの相対に変換
        $rel_path = ltrim(str_replace(UPLOAD_DIR, '', $item['path']), '/');
        $pub_url  = UPLOAD_URL_PREFIX . '/' . $rel_path;
    }
    $size_str = $item['size_bytes'] ? format_bytes((int)$item['size_bytes']) : '—';
    $dim_str  = ($item['width'] && $item['height']) ? $item['width'] . '×' . $item['height'] : '';
    $created  = $item['created_at'] ? substr($item['created_at'], 0, 10) : '';
  ?>
  <div class="media-card" data-url="<?= htmlspecialchars($pub_url, ENT_QUOTES) ?>">
    <div class="media-card__thumb">
      <img src="<?= htmlspecialchars($pub_url, ENT_QUOTES) ?>"
           alt="<?= htmlspecialchars($item['filename'], ENT_QUOTES) ?>"
           loading="lazy"
           onerror="this.closest('.media-card__thumb').classList.add('media-card__thumb--error')">
    </div>
    <div class="media-card__info">
      <p class="media-card__filename" title="<?= htmlspecialchars($item['filename'], ENT_QUOTES) ?>">
        <?= htmlspecialchars($item['filename'], ENT_QUOTES) ?>
      </p>
      <p class="media-card__meta">
        <?php if ($dim_str): ?><?= htmlspecialchars($dim_str, ENT_QUOTES) ?> &bull; <?php endif; ?>
        <?= htmlspecialchars($size_str, ENT_QUOTES) ?>
        <?php if ($item['section']): ?> &bull; <span class="badge badge--sm"><?= htmlspecialchars($item['section'], ENT_QUOTES) ?></span><?php endif; ?>
      </p>
      <p class="media-card__date"><?= htmlspecialchars($created, ENT_QUOTES) ?></p>
    </div>
    <div class="media-card__actions">
      <button type="button" class="btn btn-sm btn-ghost js-copy-url"
              data-url="<?= htmlspecialchars($pub_url, ENT_QUOTES) ?>"
              title="URLをコピー">
        コピー
      </button>
      <a href="<?= htmlspecialchars($pub_url, ENT_QUOTES) ?>" target="_blank" rel="noopener"
         class="btn btn-sm btn-ghost" title="新しいタブで開く">
        開く
      </a>
    </div>
  </div>
  <?php endforeach; ?>
</div>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // URL コピーボタン
  document.querySelectorAll('.js-copy-url').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.dataset.url;
      try {
        await navigator.clipboard.writeText(url);
        const orig = btn.textContent;
        btn.textContent = '✓ コピー済み';
        show_toast('URLをコピーしました', 'success');
        setTimeout(() => { btn.textContent = orig; }, 2000);
      } catch (e) {
        // フォールバック: プロンプトで表示
        prompt('URLをコピーしてください:', url);
      }
    });
  });
});
</script>

<style>
/* メディアグリッド スタイル（ページ固有） */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--s-4);
  margin-top: var(--s-5);
}
.media-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s ease;
}
.media-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.media-card__thumb {
  aspect-ratio: 1;
  background: var(--surface-3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.media-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-card__thumb--error::after {
  content: '画像を読み込めません';
  font-size: var(--font-xs);
  color: var(--text-3);
  padding: var(--s-2);
  text-align: center;
}
.media-card__info {
  padding: var(--s-2) var(--s-3);
  flex: 1;
}
.media-card__filename {
  font-size: var(--font-xs);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 var(--s-1);
  color: var(--text-1);
}
.media-card__meta,
.media-card__date {
  font-size: 11px;
  color: var(--text-3);
  margin: 0;
}
.media-card__actions {
  padding: var(--s-2) var(--s-3);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: var(--s-2);
}
</style>

<?php
$content = ob_get_clean();
require __DIR__ . '/layout.php';

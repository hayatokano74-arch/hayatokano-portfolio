<?php
/**
 * Garden Write — 画像アップロード API
 *
 * POST /api/upload.php  → WP Media にアップロード
 *
 * リクエスト: multipart/form-data, field="image"
 * レスポンス: { ok: true, url: "...", id: 123, filename: "..." }
 */
session_start();
require_once __DIR__ . '/config.php';

/* 認証チェック */
if (!isset($_SESSION['garden_auth']) || $_SESSION['garden_auth'] !== true) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => '認証が必要です']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POSTのみ受け付けます']);
    exit;
}

/* ファイル検証 */
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $errorCode = $_FILES['image']['error'] ?? 'no file';
    echo json_encode(['ok' => false, 'error' => "ファイルアップロードエラー: {$errorCode}"]);
    exit;
}

$file = $_FILES['image'];

/* サイズチェック */
if ($file['size'] > UPLOAD_MAX_SIZE) {
    $maxMB = UPLOAD_MAX_SIZE / 1024 / 1024;
    echo json_encode(['ok' => false, 'error' => "ファイルサイズが{$maxMB}MBを超えています"]);
    exit;
}

/* MIMEタイプチェック */
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!in_array($mime, ALLOWED_MIME, true)) {
    echo json_encode(['ok' => false, 'error' => '許可されていないファイル形式です']);
    exit;
}

/* WP Media API にアップロード */
$filename = $file['name'];
$tmpPath = $file['tmp_name'];

$ch = curl_init(WP_API_BASE . '/wp/v2/media');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Basic ' . WP_AUTH_TOKEN,
    'Content-Disposition: attachment; filename="' . rawurlencode($filename) . '"',
    'Content-Type: ' . $mime,
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents($tmpPath));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode(['ok' => false, 'error' => "通信エラー: {$error}"]);
    exit;
}

$data = json_decode($response, true);

if ($httpCode === 201 && isset($data['id'])) {
    /* アップロード成功 */
    $url = $data['source_url'] ?? $data['guid']['rendered'] ?? '';
    echo json_encode([
        'ok' => true,
        'id' => $data['id'],
        'url' => $url,
        'filename' => $filename,
    ]);
} else {
    echo json_encode([
        'ok' => false,
        'error' => $data['message'] ?? 'WPメディアアップロードに失敗しました',
    ]);
}

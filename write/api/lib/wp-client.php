<?php
/**
 * Garden Write — WP REST API クライアント共通ヘルパー
 *
 * posts.php と folders.php で重複していた wp_request() を統合。
 */
require_once __DIR__ . '/../config.php';

/**
 * WP REST API にリクエストを送信
 *
 * @param string $endpoint APIエンドポイント（例: /wp/v2/posts）
 * @param string $method   HTTPメソッド（GET, POST, PUT, DELETE）
 * @param array|null $body リクエストボディ（POST/PUTのみ）
 * @return array ['data' => mixed, 'status' => int] または ['error' => string, 'status' => 0]
 */
function wp_request(string $endpoint, string $method = 'GET', ?array $body = null): array {
    $url = WP_API_BASE . $endpoint;
    $headers = [
        'Authorization: Basic ' . WP_AUTH_TOKEN,
        'Content-Type: application/json',
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    switch ($method) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            break;
        case 'PUT':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
            break;
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            break;
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['error' => $error, 'status' => 0];
    }

    return [
        'data' => json_decode($response, true),
        'status' => $httpCode,
    ];
}

/**
 * Service Worker — WP 画像キャッシュ
 *
 * wp.hayatokano.com からの全画像をキャッシュし、
 * 2回目以降の訪問で即座に表示する。
 * キャッシュ容量は最大 2000 件を上限とし、LRU で古い画像を削除する。
 */

const CACHE_NAME = "wp-img-v2";
const IMAGE_ORIGIN = "https://wp.hayatokano.com";

// インストール時: 即座にアクティベート
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 古いキャッシュバージョンを削除
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("garden-img-") || (key.startsWith("wp-img-") && key !== CACHE_NAME))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// フェッチ: wp.hayatokano.com の画像をキャッシュファースト
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // wp.hayatokano.com からの画像リクエストのみ対象
  if (url.origin !== IMAGE_ORIGIN) return;

  // 画像ファイル拡張子のみキャッシュ
  if (!/\.(jpe?g|png|gif|webp|avif|svg|woff2?)(\?.*)?$/i.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // キャッシュヒット → 即返却
      const cached = await cache.match(event.request);
      if (cached) return cached;

      // キャッシュミス → ネットワーク取得 + キャッシュ保存
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          // キャッシュ上限チェック（超過時は古いエントリを削除）
          const keys = await cache.keys();
          if (keys.length >= 2000) {
            await cache.delete(keys[0]);
          }
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        // オフライン時はキャッシュのみ（miss時は通常のエラー）
        return new Response("", { status: 503 });
      }
    }),
  );
});

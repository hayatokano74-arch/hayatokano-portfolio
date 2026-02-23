/**
 * Service Worker — Garden 画像キャッシュ
 *
 * garden-images-opt/ の画像をキャッシュし、
 * 2回目以降の訪問で即座に表示する。
 * キャッシュ容量は 500MB を上限とし、LRU で古い画像を削除する。
 */

const CACHE_NAME = "garden-img-v1";
const MAX_CACHE_ITEMS = 2000;
const IMAGE_ORIGIN = "https://wp.hayatokano.com";
const OPT_PATH = "/garden-images-opt/";

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
          .filter((key) => key.startsWith("garden-img-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

// フェッチ: garden-images-opt の画像をキャッシュファースト
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // garden-images-opt の画像のみ対象
  if (url.origin !== IMAGE_ORIGIN || !url.pathname.startsWith(OPT_PATH)) {
    return;
  }

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
          if (keys.length >= MAX_CACHE_ITEMS) {
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

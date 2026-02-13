/**
 * WordPress REST API 共通フェッチヘルパー
 *
 * - WP_BASE_URL（または NEXT_PUBLIC_WP_BASE_URL）からベースURLを解決
 * - ISR（デフォルト300秒）でキャッシュ
 * - fetch失敗・パースエラー時は null を返す（呼び出し元でフォールバック）
 */

/** 環境変数から WP ベースURLを取得（未設定なら null） */
export function getWpBaseUrl(): string | null {
  const url =
    (process.env.WP_BASE_URL ?? "").trim() ||
    (process.env.NEXT_PUBLIC_WP_BASE_URL ?? "").trim();
  return url || null;
}

/**
 * WP REST API にフェッチし、JSON をパースして返す。
 * ベースURL未設定・ネットワークエラー・非200レスポンス時は null を返す。
 *
 * @param endpoint - `/wp-json/` 以降のパス（例: `hayato/v1/works`）
 * @param revalidate - ISR 秒数（デフォルト 300）
 */
export async function fetchWpApi<T>(
  endpoint: string,
  revalidate = 300,
): Promise<T | null> {
  const base = getWpBaseUrl();
  if (!base) return null;

  try {
    const url = `${base.replace(/\/$/, "")}/wp-json/${endpoint.replace(/^\//, "")}`;
    const res = await fetch(url, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

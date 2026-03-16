/**
 * 目の星 — エントリーポイント（re-export）
 *
 * 既存の import パス `@/lib/meNoHoshi` との互換性を維持するため、
 * 分割先モジュールからすべての公開APIを re-export する。
 */

/* 型 */
export type { MeNoHoshiPost, MeNoHoshiDetailItem, MeNoHoshiKeyVisual, MeNoHoshiArchiveWork } from "./me-no-hoshi/types";
export type { WpMeNoHoshiResponse } from "./me-no-hoshi/types";

/* ユーティリティ純粋関数 */
export { fixBrokenUnicodeUrl, ensureHtml, normalizeTag } from "./me-no-hoshi/utils";

/* データ正規化 */
export { normalizePost, normalizeDetails, normalizeKeyVisualList, normalizeWorkList } from "./me-no-hoshi/normalize";

/* API取得・フォールバック・キャッシュ付き関数 */
export { getMeNoHoshiPosts, getMeNoHoshiBySlug, meNoHoshiFallbackPosts } from "./me-no-hoshi/api";

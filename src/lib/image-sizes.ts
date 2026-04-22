/**
 * Next.js Image コンポーネント用 sizes 属性の共通定義
 *
 * WorksClient.tsx / IndexGrid.tsx など複数コンポーネントで
 * 同じ文字列を繰り返し書かないよう、ここで一元管理する。
 */

/**
 * Works グリッドサムネイル用
 * モバイル: フル幅 / タブレット: 1/3 幅 / デスクトップ: 420px固定
 */
export const SIZES_WORKS_GRID = "(max-width: 900px) 100vw, (max-width: 1400px) 33vw, 420px" as const;

/**
 * Works 詳細 IndexGrid（サイドバムネイル一覧）用
 * モバイル: フル幅 / タブレット: 1/2 幅 / デスクトップ: 320px固定
 */
export const SIZES_INDEX_GRID = "(max-width: 720px) 100vw, (max-width: 1024px) 50vw, 320px" as const;

/**
 * Garden 一覧・詳細の画像用
 * モバイル: フル幅 / デスクトップ: 920px固定
 */
export const SIZES_GARDEN = "(max-width: 900px) 100vw, 920px" as const;

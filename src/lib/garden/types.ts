/* Garden ノードの型定義 */

/** ノードの種類 */
export type GardenNodeType = "diary" | "note" | "memo";

/** Markdownファイルのfrontmatter */
export interface GardenFrontmatter {
  title: string;
  date: string;
  tags?: string[];
  type?: GardenNodeType;
}

/** パース済みのGardenノード（MDファイルが存在する実ページ） */
export interface GardenNode {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  type: GardenNodeType;
  /** HTML変換済みの本文 */
  contentHtml: string;
  /** 抜粋テキスト（カード表示用） */
  excerpt: string;
}

/** リンクされたページの概要（カード表示用） */
export interface LinkedPageSummary {
  slug: string;
  title: string;
  /** 本文抜粋（実ページのみ。仮想ページはundefined） */
  excerpt?: string;
}

/** 2-hopリンクグループ（中継ページでグループ化） */
export interface TwoHopGroup {
  /** 中継ページのタイトル（グループ見出し） */
  via: string;
  /** 中継ページのslug */
  viaSlug: string;
  /** このリンクを共有する関連ページ一覧 */
  pages: LinkedPageSummary[];
}

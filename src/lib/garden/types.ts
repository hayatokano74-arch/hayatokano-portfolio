/* Garden ノードの型定義 */

/** Markdownファイルのfrontmatter */
export interface GardenFrontmatter {
  title: string;
  date: string;
  tags?: string[];
}

/** パース済みのGardenノード（MDファイルが存在する実ページ） */
export interface GardenNode {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  /** HTML変換済みの本文 */
  contentHtml: string;
  /** 抜粋テキスト（カード表示用） */
  excerpt: string;
  /** ファイル更新時刻（同日投稿のソート用、Unix ms） */
  mtime: number;
}

/** リンクされたページの概要（カード表示用） */
export interface LinkedPageSummary {
  slug: string;
  title: string;
  /** 本文抜粋（実ページのみ。仮想ページはundefined） */
  excerpt?: string;
  /** 投稿日（実ページのみ。仮想ページはundefined） */
  date?: string;
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

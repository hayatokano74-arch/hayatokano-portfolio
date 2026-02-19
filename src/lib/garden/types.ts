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

/** バックリンクエントリ */
export interface BacklinkEntry {
  slug: string;
  title: string;
  /** リンクを含む文脈テキスト */
  context: string;
}

/** 2-hopリンクグループ（共有リンクでグループ化された関連ページ） */
export interface TwoHopGroup {
  /** 共有リンク先のタイトル（グループヘッダー） */
  via: string;
  /** 共有リンク先のslug */
  viaSlug: string;
  /** このリンクを共有する他のページ一覧 */
  pages: { slug: string; title: string }[];
}

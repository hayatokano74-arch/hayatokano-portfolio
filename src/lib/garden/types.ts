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

/** フォワードリンクエントリ（ページ内に書かれたリンク先） */
export interface ForwardLinkEntry {
  slug: string;
  title: string;
}

/** バックリンクエントリ */
export interface BacklinkEntry {
  slug: string;
  title: string;
  /** リンクを含む文脈テキスト */
  context: string;
}

/** 2-hopリンクエントリ（間接的に関連するページ） */
export interface TwoHopEntry {
  slug: string;
  title: string;
  /** 中継ページのタイトル（A→B→Cの場合、Bのタイトル） */
  via: string;
}

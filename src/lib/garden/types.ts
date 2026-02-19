/* Garden ノードの型定義 */

/** Markdownファイルのfrontmatter */
export interface GardenFrontmatter {
  title: string;
  date: string;
  tags?: string[];
}

/** パース済みのGardenノード */
export interface GardenNode {
  slug: string;
  title: string;
  date: string;
  tags: string[];
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

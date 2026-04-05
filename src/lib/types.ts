/**
 * 共通型定義
 *
 * Works, Text, News 等で使用する型。
 * 以前は mock.ts に同居していたが、型とモックデータを分離するためここに移動。
 */

export type WorkTag = string;

export type Work = {
  slug: string;
  date: string; // YYYY/MM/DD
  title: string;
  tags: WorkTag[];
  year: string;
  excerpt: string;
  details: {
    /* 展示・イベント */
    exhibition_type?: string;
    exhibition_title?: string;
    artist?: string;
    artists?: string;
    period?: string;
    venue?: string;
    address?: string;
    access?: string;
    hours?: string;
    closed?: string;
    admission?: string;
    organizer?: string;
    curator?: string;
    supported_by?: string;
    /* クライアント・コミッション */
    client?: string;
    project_type?: string;
    role?: string;
    collaborators?: string;
    /* 出版・寄稿 */
    publisher?: string;
    publication_title?: string;
    isbn?: string;
    pages?: string;
    binding?: string;
    price?: string;
    contribution_type?: string;
    /* 作品情報 */
    medium?: string;
    dimensions?: string;
    edition?: string;
    series?: string;
    duration?: string;
    format?: string;
    /* クレジット */
    credit_photo?: string;
    credit_design?: string;
    credit_text?: string;
    credit_sound?: string;
    credit_video?: string;
    credit_translation?: string;
    credit_cooperation?: string;
    /* 実績・その他 */
    award?: string;
    grant?: string;
    residency?: string;
    collection?: string;
    url?: string;
    related_url?: string;
    /* 後方互換 */
    bio?: string;
    [key: string]: string | undefined;
  };
  thumbnail?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  media: {
    id: string;
    type: "image" | "video";
    src: string;
    alt: string;
    width: number;
    height: number;
    poster?: string;
  }[];
  pinned?: boolean;
};

export type TextPost = {
  slug: string;
  year: string;
  title: string;
  categories: Exclude<WorkTag, "Exhibition">[];
  body: string;
  toc?: { id: string; label: string }[];
  sections?: { id: string; heading: string; body: string }[];
};

export type NewsItem = {
  id: string;
  date: string;
  title: string;
  body: string;
  image?: { src: string; width: number; height: number };
};

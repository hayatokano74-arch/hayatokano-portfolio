/**
 * 共通型定義
 *
 * Works, Timeline, Text, News 等で使用する型。
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
    /* 展示情報（基本） */
    exhibition_type?: string;   /* 個展 / グループ展 / 芸術祭 / アートフェア / 企画展 / 上映 等 */
    exhibition_title?: string;  /* 展覧会名（グループ展等では作品タイトルと別） */
    artist: string;
    period: string;
    venue: string;
    address?: string;
    access?: string;
    hours?: string;
    closed?: string;
    admission?: string;
    organizer?: string;
    curator?: string;
    artists?: string;           /* 出展作家（グループ展の場合） */
    supported_by?: string;      /* 主催・共催・後援・協賛・助成 */
    url?: string;               /* 展覧会ウェブサイト */
    /* 作品情報 */
    medium?: string;
    dimensions?: string;
    edition?: string;
    series?: string;
    /* 出版情報 */
    publisher?: string;
    pages?: string;
    binding?: string;
    price?: string;
    /* クレジット */
    credit_photo?: string;
    credit_design?: string;
    credit_text?: string;       /* テキスト・文章 */
    credit_sound?: string;      /* 音響（映像・インスタレーション） */
    credit_video?: string;      /* 映像編集 */
    credit_translation?: string; /* 翻訳 */
    credit_cooperation?: string;
    /* 実績 */
    award?: string;             /* 受賞 */
    collection?: string;        /* 所蔵・収蔵（美術館等） */
    /* その他 */
    bio?: string;
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

export type TimelineItem = {
  id: string;
  date: string;
  type: "photo" | "text";
  title?: string;
  text: string;
  tags?: string[];
  images?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }[];
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

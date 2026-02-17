/**
 * WordPress REST API レスポンス型
 *
 * 全フィールド optional — normalize 関数で安全にデフォルト値へ変換する。
 */

/** GET /hayato/v1/works */
export type WpWorkResponse = {
  slug?: string;
  date?: string;
  title?: string;
  tags?: string[];
  year?: string;
  excerpt?: string;
  thumbnail?: {
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  details?: {
    exhibition_type?: string;
    exhibition_title?: string;
    artist?: string;
    period?: string;
    venue?: string;
    address?: string;
    access?: string;
    hours?: string;
    closed?: string;
    admission?: string;
    organizer?: string;
    curator?: string;
    artists?: string;
    supported_by?: string;
    url?: string;
    medium?: string;
    dimensions?: string;
    edition?: string;
    series?: string;
    publisher?: string;
    pages?: string;
    binding?: string;
    price?: string;
    credit_photo?: string;
    credit_design?: string;
    credit_text?: string;
    credit_sound?: string;
    credit_video?: string;
    credit_translation?: string;
    credit_cooperation?: string;
    award?: string;
    collection?: string;
    bio?: string;
  };
  media?: {
    id?: string;
    type?: string;
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
    poster?: string;
  }[];
};

/** GET /hayato/v1/text */
export type WpTextResponse = {
  slug?: string;
  year?: string;
  title?: string;
  categories?: string[];
  body?: string;
  toc?: { id?: string; label?: string }[];
  sections?: { id?: string; heading?: string; body?: string }[];
};

/** GET /hayato/v1/news */
export type WpNewsResponse = {
  id?: string;
  date?: string;
  title?: string;
  body?: string;
  image?: {
    src?: string;
    width?: number;
    height?: number;
  };
};

/** GET /hayato/v1/timeline */
export type WpTimelineResponse = {
  id?: string;
  date?: string;
  type?: string;
  title?: string;
  text?: string;
  tags?: string[];
  images?: {
    src?: string;
    alt?: string;
    width?: number;
    height?: number;
  }[];
};

/** GET /hayato/v1/about */
export type WpAboutResponse = {
  statement?: string;
  photos?: {
    src?: string;
    width?: number;
    height?: number;
  }[];
  cv?: {
    year?: string;
    content?: string;
  }[];
};

/**
 * 目の星 — 型定義
 */
import { type Work } from "@/lib/types";

/** DETAILS の1項目（順序付き） */
export type MeNoHoshiDetailItem = {
  key: string;
  label: string;
  value: string;
};

export type MeNoHoshiArchiveWork = {
  id: string;
  title: string;
  year: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
};

export type MeNoHoshiKeyVisual = {
  id: string;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  caption: string;
};

export type MeNoHoshiPost = {
  slug: string;
  date: string;
  title: string;
  subtitle: string;
  tags: string[];
  year: string;
  excerpt: string;
  media: Work["media"];
  details: MeNoHoshiDetailItem[];
  bio: string;
  pastExhibitions: string[];
  snsLinks: { label: string; url: string }[];
  statement: string;
  notice: string;
  keyVisuals: MeNoHoshiKeyVisual[];
  heroCaption: string;
  pastWorks: MeNoHoshiArchiveWork[];
  archiveNote: string;
  archiveWorks: MeNoHoshiArchiveWork[];
  showKeyVisuals: boolean;
  showPastWorks: boolean;
  showArchiveWorks: boolean;
};

/** WP REST API からのレスポンス型（全フィールドオプショナル） */
export type WpMeNoHoshiResponse = {
  slug?: string;
  date?: string;
  title?: string;
  subtitle?: string;
  year?: string;
  tags?: string[];
  excerpt?: string;
  media?: Work["media"];
  details?: { key?: string; label?: string; value?: string }[] | Record<string, string>;
  bio?: string;
  pastExhibitions?: string;
  snsLinks?: { label?: string; url?: string }[];
  statement?: string;
  notice?: string;
  showKeyVisuals?: boolean;
  showPastWorks?: boolean;
  showArchiveWorks?: boolean;
  keyVisuals?: {
    id?: string;
    image?: {
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
    };
    caption?: string;
  }[];
  heroCaption?: string;
  pastWorks?: {
    id?: string;
    title?: string;
    year?: string;
    image?: {
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
    };
  }[];
  archiveNote?: string;
  archiveWorks?: {
    id?: string;
    title?: string;
    year?: string;
    image?: {
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
    };
  }[];
};

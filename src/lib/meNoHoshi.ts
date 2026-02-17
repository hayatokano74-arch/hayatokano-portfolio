import { cache } from "react";
import { type Work, type WorkTag } from "@/lib/mock";
import { fetchWpApi } from "@/lib/wp/client";

/* モジュールレベルに RegExp を巻き上げ（js-hoist-regexp） */
const RE_UNICODE_TEST = /u[0-9a-fA-F]{4}/;
const RE_UNICODE_REPLACE = /u([0-9a-fA-F]{4})/g;
const RE_HTML_TAG = /<[a-z][\s\S]*?>/i;

/** DETAILS の1項目（順序付き） */
type MeNoHoshiDetailItem = {
  key: string;
  label: string;
  value: string;
};

type MeNoHoshiArchiveWork = {
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

type MeNoHoshiKeyVisual = {
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
  tags: WorkTag[];
  year: string;
  excerpt: string;
  media: Work["media"];
  details: MeNoHoshiDetailItem[];
  bio: string;
  announcement: string;
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

type WpMeNoHoshiResponse = {
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
  announcement?: string;
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

function normalizeKeyVisualList(items: WpMeNoHoshiResponse["keyVisuals"], slug: string) {
  return (items ?? [])
    .map((item, index) => {
      const src = fixBrokenUnicodeUrl((item.image?.src ?? "").trim());
      if (!src) return null;
      return {
        id: item.id?.trim() || `${slug}-key-visual-${index + 1}`,
        image: {
          src,
          alt: item.image?.alt?.trim() || "",
          width: item.image?.width ?? 1600,
          height: item.image?.height ?? 1000,
        },
        caption: (item.caption ?? "").trim(),
      };
    })
    .filter((item): item is MeNoHoshiKeyVisual => Boolean(item));
}

function normalizeWorkList(items: WpMeNoHoshiResponse["archiveWorks"], slug: string, key: "past" | "archive") {
  return (items ?? [])
    .map((item, index) => {
      const src = fixBrokenUnicodeUrl((item.image?.src ?? "").trim());
      if (!src) return null;
      return {
        id: item.id?.trim() || `${slug}-${key}-${index + 1}`,
        title: item.title?.trim() || "Work",
        year: item.year?.trim() || "",
        image: {
          src,
          alt: item.image?.alt?.trim() || "",
          width: item.image?.width ?? 1200,
          height: item.image?.height ?? 900,
        },
      };
    })
    .filter((item): item is MeNoHoshiArchiveWork => Boolean(item));
}

/** HTMLタグがなければ改行をbrに変換、HTMLがあればそのまま返す */
function ensureHtml(text: string): string {
  if (!text) return "";
  if (RE_HTML_TAG.test(text)) return text;
  return text.replace(/\n/g, "<br />");
}

/** DETAILS配列の正規化（新形式: 配列 / 旧形式: オブジェクト 両対応） */
function normalizeDetails(raw: WpMeNoHoshiResponse["details"]): MeNoHoshiDetailItem[] {
  const defaultOrder = ["artist", "period", "open_date", "hours", "closed", "admission", "venue", "address", "access"];
  const labels: Record<string, string> = {
    artist: "ARTIST", period: "PERIOD", open_date: "OPEN",
    hours: "HOURS", closed: "CLOSED", admission: "ADMISSION",
    venue: "VENUE", address: "ADDRESS", access: "ACCESS",
  };

  /* 新形式: 配列 */
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is { key: string; label: string; value: string } =>
        typeof item === "object" && item !== null && typeof item.key === "string",
      )
      .map((item) => ({
        key: item.key,
        label: item.label || labels[item.key] || item.key.toUpperCase(),
        value: String(item.value ?? "").trim(),
      }));
  }

  /* 旧形式: オブジェクト（後方互換） */
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, string>;
    return defaultOrder.map((key) => ({
      key,
      label: labels[key] || key.toUpperCase(),
      value: String(obj[key] ?? "").trim(),
    }));
  }

  return [];
}

/**
 * 壊れたUnicodeエスケープ（uXXXX → 正しいUnicode文字）を復元
 * WP sanitize_file_name() がCJK文字を壊した場合のフォールバック
 */
function fixBrokenUnicodeUrl(url: string): string {
  if (!RE_UNICODE_TEST.test(url)) return url;
  return url.replace(RE_UNICODE_REPLACE, (_match, hex) => {
    const cp = parseInt(hex, 16);
    if (cp >= 0x3000 && cp <= 0x9fff) return String.fromCodePoint(cp);
    if (cp >= 0xf900 && cp <= 0xfaff) return String.fromCodePoint(cp);
    if (cp >= 0xff00 && cp <= 0xffef) return String.fromCodePoint(cp);
    return _match;
  });
}

function normalizeTag(value: string): WorkTag | null {
  const allowed: WorkTag[] = ["Photography", "Video", "Personal", "Portrait", "Exhibition"];
  return allowed.includes(value as WorkTag) ? (value as WorkTag) : null;
}

function normalizePost(post: WpMeNoHoshiResponse): MeNoHoshiPost | null {
  const slug = (post.slug ?? "").trim();
  const title = (post.title ?? "").trim();
  const subtitle = (post.subtitle ?? "").trim();
  if (!slug || !title) return null;

  const tags = (post.tags ?? []).map(normalizeTag).filter((tag): tag is WorkTag => Boolean(tag));
  const media = (post.media ?? [])
    .filter((item) => !!item?.id && !!item?.src)
    .map((item) => ({ ...item, src: fixBrokenUnicodeUrl(item.src), ...(item.poster ? { poster: fixBrokenUnicodeUrl(item.poster) } : {}) }));
  if (media.length === 0) return null;

  const details = normalizeDetails(post.details);
  const keyVisuals = normalizeKeyVisualList(post.keyVisuals, slug);
  const pastWorks = normalizeWorkList(post.pastWorks, slug, "past");
  const archiveWorks = normalizeWorkList(post.archiveWorks, slug, "archive");

  /* bio: 新形式(トップレベル) / 旧形式(details内) 両対応 */
  const bioRaw = post.bio ?? (
    typeof post.details === "object" && !Array.isArray(post.details)
      ? (post.details as Record<string, string>).bio
      : undefined
  );

  return {
    slug,
    date: (post.date ?? "2024/10/09").trim(),
    title,
    subtitle,
    tags: tags.length > 0 ? tags : ["Photography"],
    year: (post.year ?? "2025").trim(),
    excerpt: (post.excerpt ?? "").trim(),
    media,
    details,
    bio: ensureHtml(String(bioRaw ?? "").trim()),
    announcement: ensureHtml((post.announcement ?? "").trim()),
    statement: ensureHtml((post.statement ?? "").trim()),
    notice: (post.notice ?? "").trim(),
    keyVisuals,
    heroCaption: (post.heroCaption ?? "").trim(),
    pastWorks,
    archiveNote: (post.archiveNote ?? "").trim(),
    archiveWorks,
    showKeyVisuals: post.showKeyVisuals !== false,
    showPastWorks: post.showPastWorks !== false,
    showArchiveWorks: post.showArchiveWorks !== false,
  };
}

async function fetchWpMeNoHoshiPosts(): Promise<MeNoHoshiPost[] | null> {
  const data = await fetchWpApi<unknown>("hayato/v1/me-no-hoshi");
  if (!data || !Array.isArray(data)) return null;

  // WP APIが空配列を返した場合もフォールバックせず空配列を返す
  return data
    .map((item) => normalizePost(item as WpMeNoHoshiResponse))
    .filter((item): item is MeNoHoshiPost => Boolean(item));
}

export const meNoHoshiFallbackPosts: MeNoHoshiPost[] = [
  {
    slug: "yume-no-niwa",
    date: "2024/05/01",
    title: "夢の庭",
    subtitle: "架空 太郎",
    tags: ["Exhibition", "Photography", "Personal"],
    year: "2024",
    excerpt: "居住と記憶の境界をめぐる写真展示。",
    media: [
      {
        id: "hero-1",
        type: "image",
        src: "https://picsum.photos/seed/me-no-hoshi-hero-1/1600/1000",
        alt: "夢の庭 hero",
        width: 1600,
        height: 1000,
      },
      {
        id: "detail-1",
        type: "image",
        src: "https://picsum.photos/seed/me-no-hoshi-detail-1/1200/1600",
        alt: "夢の庭 detail 1",
        width: 1200,
        height: 1600,
      },
      {
        id: "detail-2",
        type: "image",
        src: "https://picsum.photos/seed/me-no-hoshi-detail-2/1600/1200",
        alt: "夢の庭 detail 2",
        width: 1600,
        height: 1200,
      },
    ],
    details: [
      { key: "artist", label: "ARTIST", value: "架空 太郎" },
      { key: "period", label: "PERIOD", value: "2024.05.01–2024.05.19" },
      { key: "hours", label: "HOURS", value: "12:00–18:00" },
      { key: "closed", label: "CLOSED", value: "Tue" },
      { key: "admission", label: "ADMISSION", value: "Free" },
      { key: "venue", label: "VENUE", value: "目の星（石巻）" },
      { key: "address", label: "ADDRESS", value: "宮城県石巻市（住所は仮）" },
      { key: "access", label: "ACCESS", value: "JR石巻駅から徒歩10分（仮）" },
    ],
    bio: "北海道札幌市生まれ。写真を軸に、風景と生活の関係を主題に制作。近年は展示空間と写真の距離感を含めた構成にも取り組む。",
    announcement: "",
    statement:
      "本展は、居住と記憶の境界をめぐる写真展。展示は小さな空間の中で、光と距離に応答しながら構成された。",
    notice: "※展示情報は変更となる場合があります。最新情報はこのページをご確認ください。",
    showKeyVisuals: true,
    showPastWorks: true,
    showArchiveWorks: true,
    keyVisuals: [
      {
        id: "kv-1",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-hero-1/1600/1000",
          alt: "夢の庭 key visual 1",
          width: 1600,
          height: 1000,
        },
        caption: "",
      },
    ],
    heroCaption: "Key visual / representative work",
    pastWorks: [
      {
        id: "past-2019",
        title: "Work — 2019",
        year: "2019",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-2019/1200/900",
          alt: "Work 2019",
          width: 1200,
          height: 900,
        },
      },
      {
        id: "past-2020",
        title: "Work — 2020",
        year: "2020",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-2020-portrait/900/1300",
          alt: "Work 2020 portrait",
          width: 900,
          height: 1300,
        },
      },
    ],
    archiveNote: "アーカイブ（展示風景写真）は会期終了後に追加されます。",
    archiveWorks: [
      {
        id: "arc-2021",
        title: "Work — 2021",
        year: "2021",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-2021/1200/900",
          alt: "Work 2021",
          width: 1200,
          height: 900,
        },
      },
      {
        id: "arc-2022",
        title: "Work — 2022",
        year: "2022",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-2022-portrait/900/1300",
          alt: "Work 2022 portrait",
          width: 900,
          height: 1300,
        },
      },
    ],
  },
  {
    slug: "kage-no-kioku",
    date: "2024/09/14",
    title: "影の記憶",
    subtitle: "架空 花",
    tags: ["Photography", "Portrait"],
    year: "2024",
    excerpt: "肖像と空間を横断するインスタレーション。",
    media: [
      {
        id: "hero-2",
        type: "image",
        src: "https://picsum.photos/seed/me-no-hoshi-hero-2/1600/1000",
        alt: "影の記憶 hero",
        width: 1600,
        height: 1000,
      },
      {
        id: "detail-3",
        type: "image",
        src: "https://picsum.photos/seed/me-no-hoshi-detail-3/1000/1600",
        alt: "影の記憶 detail 1",
        width: 1000,
        height: 1600,
      },
    ],
    details: [
      { key: "artist", label: "ARTIST", value: "架空 花" },
      { key: "period", label: "PERIOD", value: "2024.09.14–2024.10.20" },
      { key: "hours", label: "HOURS", value: "11:00–19:00" },
      { key: "closed", label: "CLOSED", value: "Mon" },
      { key: "admission", label: "ADMISSION", value: "Free" },
      { key: "venue", label: "VENUE", value: "目の星（石巻）" },
      { key: "address", label: "ADDRESS", value: "宮城県石巻市（住所は仮）" },
      { key: "access", label: "ACCESS", value: "JR石巻駅から徒歩12分（仮）" },
    ],
    bio: "宮城県石巻市出身。光の変化にともなう風景の輪郭を主題に、写真と文章を往復しながら制作を行う。",
    announcement: "",
    statement: "日常の明暗差と記憶の輪郭を、複数のシリーズで再編集した展示。",
    notice: "※詳細は更新される場合があります。",
    showKeyVisuals: true,
    showPastWorks: true,
    showArchiveWorks: true,
    keyVisuals: [
      {
        id: "kv-2",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-hero-2/1600/1000",
          alt: "影の記憶 key visual 1",
          width: 1600,
          height: 1000,
        },
        caption: "",
      },
    ],
    heroCaption: "Selected work from the exhibition",
    pastWorks: [
      {
        id: "past-2023",
        title: "Work — 2023",
        year: "2023",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-2023/1200/900",
          alt: "Work 2023",
          width: 1200,
          height: 900,
        },
      },
      {
        id: "past-2024",
        title: "Work — 2024",
        year: "2024",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-2024/1200/900",
          alt: "Work 2024",
          width: 1200,
          height: 900,
        },
      },
    ],
    archiveNote: "過去作は今後追加予定です。",
    archiveWorks: [
      {
        id: "arc-2025",
        title: "Work — 2025",
        year: "2025",
        image: {
          src: "https://picsum.photos/seed/me-no-hoshi-2025/1200/900",
          alt: "Work 2025",
          width: 1200,
          height: 900,
        },
      },
    ],
  },
];

/** 目の星 全件取得（React.cache でリクエスト単位の重複排除） */
export const getMeNoHoshiPosts = cache(async (): Promise<MeNoHoshiPost[]> => {
  const wpPosts = await fetchWpMeNoHoshiPosts();
  return wpPosts ?? meNoHoshiFallbackPosts;
});

/** slug 指定で1件取得（React.cache でリクエスト単位の重複排除） */
export const getMeNoHoshiBySlug = cache(async (slug: string): Promise<MeNoHoshiPost | undefined> => {
  const all = await getMeNoHoshiPosts();
  return all.find((p) => p.slug === slug);
});

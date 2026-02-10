import { type Work, type WorkTag } from "@/lib/mock";

type MeNoHoshiDetails = {
  artist: string;
  period: string;
  venue: string;
  hours: string;
  closed: string;
  admission: string;
  address: string;
  access: string;
  bio?: string;
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
  details: MeNoHoshiDetails;
  statement: string;
  notice: string;
  keyVisuals: MeNoHoshiKeyVisual[];
  heroCaption: string;
  pastWorks: MeNoHoshiArchiveWork[];
  archiveNote: string;
  archiveWorks: MeNoHoshiArchiveWork[];
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
  details?: Partial<MeNoHoshiDetails>;
  statement?: string;
  notice?: string;
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
      const src = (item.image?.src ?? "").trim();
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
      const src = (item.image?.src ?? "").trim();
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
  const media = (post.media ?? []).filter((item) => !!item?.id && !!item?.src);
  if (media.length === 0) return null;

  const details = post.details ?? {};
  const keyVisuals = normalizeKeyVisualList(post.keyVisuals, slug);
  const pastWorks = normalizeWorkList(post.pastWorks, slug, "past");
  const archiveWorks = normalizeWorkList(post.archiveWorks, slug, "archive");

  return {
    slug,
    date: (post.date ?? "2024/10/09").trim(),
    title,
    subtitle,
    tags: tags.length > 0 ? tags : ["Photography"],
    year: (post.year ?? "2025").trim(),
    excerpt: (post.excerpt ?? "").trim(),
    media,
    details: {
      artist: (details.artist ?? "").trim(),
      period: (details.period ?? "").trim(),
      venue: (details.venue ?? "").trim(),
      hours: (details.hours ?? "").trim(),
      closed: (details.closed ?? "").trim(),
      admission: (details.admission ?? "").trim(),
      address: (details.address ?? "").trim(),
      access: (details.access ?? "").trim(),
      bio: (details.bio ?? "").trim(),
    },
    statement: (post.statement ?? "").trim(),
    notice: (post.notice ?? "").trim(),
    keyVisuals,
    heroCaption: (post.heroCaption ?? "").trim(),
    pastWorks,
    archiveNote: (post.archiveNote ?? "").trim(),
    archiveWorks,
  };
}

async function fetchWpMeNoHoshiPosts(): Promise<MeNoHoshiPost[] | null> {
  const base =
    (process.env.WP_BASE_URL ?? "").trim() ||
    (process.env.NEXT_PUBLIC_WP_BASE_URL ?? "").trim();
  if (!base) return null;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/wp-json/hayato/v1/me-no-hoshi`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return null;
    const normalized = data
      .map((item) => normalizePost(item as WpMeNoHoshiResponse))
      .filter((item): item is MeNoHoshiPost => Boolean(item));
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
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
    details: {
      artist: "架空 太郎",
      period: "2024.05.01–2024.05.19",
      venue: "目の星（石巻）",
      hours: "12:00–18:00",
      closed: "Tue",
      admission: "Free",
      address: "宮城県石巻市（住所は仮）",
      access: "JR石巻駅から徒歩10分（仮）",
      bio: "北海道札幌市生まれ。写真を軸に、風景と生活の関係を主題に制作。近年は展示空間と写真の距離感を含めた構成にも取り組む。",
    },
    statement:
      "本展は、居住と記憶の境界をめぐる写真展。展示は小さな空間の中で、光と距離に応答しながら構成された。",
    notice: "※展示情報は変更となる場合があります。最新情報はこのページをご確認ください。",
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
    details: {
      artist: "架空 花",
      period: "2024.09.14–2024.10.20",
      venue: "目の星（石巻）",
      hours: "11:00–19:00",
      closed: "Mon",
      admission: "Free",
      address: "宮城県石巻市（住所は仮）",
      access: "JR石巻駅から徒歩12分（仮）",
      bio: "宮城県石巻市出身。光の変化にともなう風景の輪郭を主題に、写真と文章を往復しながら制作を行う。",
    },
    statement: "日常の明暗差と記憶の輪郭を、複数のシリーズで再編集した展示。",
    notice: "※詳細は更新される場合があります。",
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

export async function getMeNoHoshiPosts() {
  const wpPosts = await fetchWpMeNoHoshiPosts();
  return wpPosts ?? meNoHoshiFallbackPosts;
}

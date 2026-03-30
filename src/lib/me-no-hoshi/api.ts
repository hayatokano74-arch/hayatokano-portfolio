/**
 * 目の星 — WP API 呼び出し・フォールバックデータ・キャッシュ付きエクスポート関数
 */
import { cache } from "react";
import { fetchWpApi } from "@/lib/wp/client";
import type { MeNoHoshiPost, WpMeNoHoshiResponse } from "./types";
import { normalizePost } from "./normalize";

/** グリッドカードの表示フィールド設定 */
export type MeNoHoshiGridField = {
  key: string;
  label: string;
  visible: boolean;
};

/** グリッド設定のデフォルト値（WP未設定時のフォールバック） */
const defaultGridFields: MeNoHoshiGridField[] = [
  { key: "artist",    label: "ARTIST",    visible: true  },
  { key: "period",    label: "PERIOD",    visible: true  },
  { key: "open_date", label: "OPEN",      visible: true  },
  { key: "hours",     label: "HOURS",     visible: true  },
  { key: "closed",    label: "CLOSED",    visible: false },
  { key: "admission", label: "ADMISSION", visible: false },
  { key: "venue",     label: "VENUE",     visible: true  },
  { key: "address",   label: "ADDRESS",   visible: false },
  { key: "access",    label: "ACCESS",    visible: false },
];

/** WPのグリッド表示設定を取得（React.cache でリクエスト単位の重複排除） */
export const getMeNoHoshiGridSettings = cache(async (): Promise<MeNoHoshiGridField[]> => {
  const data = await fetchWpApi<MeNoHoshiGridField[]>("hayato/v1/me-no-hoshi-grid-settings");
  if (!data || !Array.isArray(data) || data.length === 0) return defaultGridFields;
  return data;
});

/** WP REST API から目の星データを取得 */
async function fetchWpMeNoHoshiPosts(): Promise<MeNoHoshiPost[] | null> {
  const data = await fetchWpApi<unknown>("hayato/v1/me-no-hoshi");
  if (!data || !Array.isArray(data)) return null;

  // WP APIが空配列を返した場合もフォールバックせず空配列を返す
  return data
    .map((item) => normalizePost(item as WpMeNoHoshiResponse))
    .filter((item): item is MeNoHoshiPost => Boolean(item));
}

/** API取得失敗時のフォールバックデータ */
export const meNoHoshiFallbackPosts: MeNoHoshiPost[] = [
  {
    slug: "yume-no-niwa",
    date: "2024/05/01",
    title: "夢の庭",
    subtitle: "架空 太郎",
    tags: ["Exhibition", "Photography", "Personal"],
    year: "2024",
    excerpt: "本展は、居住と記憶の境界をめぐる写真展。展示は小さな空間の中で、光と距離に応答しながら構成された。",
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
    pastExhibitions: [
      { year: "2023", info: "Work Archive 2023 / ギャラリー名（仮）" },
      { year: "2022", info: "Group Exhibition / スペース名（仮）" },
    ],
    snsLinks: [],
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
    excerpt: "日常の明暗差と記憶の輪郭を、複数のシリーズで再編集した展示。",
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
    pastExhibitions: [],
    snsLinks: [],
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

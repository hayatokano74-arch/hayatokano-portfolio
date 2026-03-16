/**
 * 目の星 — データ正規化
 */
import type {
  MeNoHoshiPost,
  MeNoHoshiKeyVisual,
  MeNoHoshiArchiveWork,
  MeNoHoshiDetailItem,
  WpMeNoHoshiResponse,
} from "./types";
import { fixBrokenUnicodeUrl, ensureHtml, normalizeTag } from "./utils";

/** キービジュアル配列の正規化 */
export function normalizeKeyVisualList(items: WpMeNoHoshiResponse["keyVisuals"], slug: string) {
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

/** pastWorks / archiveWorks 配列の正規化 */
export function normalizeWorkList(items: WpMeNoHoshiResponse["archiveWorks"], slug: string, key: "past" | "archive") {
  return (items ?? [])
    .map((item, index) => {
      const src = fixBrokenUnicodeUrl((item.image?.src ?? "").trim());
      if (!src) return null;
      return {
        id: item.id?.trim() || `${slug}-${key}-${index + 1}`,
        title: item.title?.trim() || "",
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

/** DETAILS配列の正規化（新形式: 配列 / 旧形式: オブジェクト 両対応） */
export function normalizeDetails(raw: WpMeNoHoshiResponse["details"]): MeNoHoshiDetailItem[] {
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

/** WP レスポンス1件を MeNoHoshiPost に正規化 */
export function normalizePost(post: WpMeNoHoshiResponse): MeNoHoshiPost | null {
  const slug = (post.slug ?? "").trim();
  const title = (post.title ?? "").trim();
  const subtitle = (post.subtitle ?? "").trim();
  if (!slug || !title) return null;

  const tags = (post.tags ?? []).map(normalizeTag).filter((tag): tag is string => Boolean(tag));
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

  /* BIO を行ごとに分割し、details 末尾に追加する。
     改行（\n, \r\n）や <br> で分割し、各行を独立した detail 行にする。
     最初の行のみラベル "BIO"、以降は空ラベル。 */
  const bioText = String(bioRaw ?? "").trim();
  if (bioText) {
    const bioLines = bioText
      .replace(/<br\s*\/?>/gi, "\n")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    bioLines.forEach((line, i) => {
      details.push({
        key: `bio-${i}`,
        label: i === 0 ? "BIO" : "",
        value: line,
      });
    });
  }

  return {
    slug,
    date: (post.date ?? "2024/10/09").trim(),
    title,
    subtitle,
    tags,
    year: (post.year ?? "2025").trim(),
    /* excerpt: WP の抜粋があればそれを使い、なければ statement から自動生成 */
    excerpt: (post.excerpt ?? "").trim() || (post.statement ?? "").trim(),
    media,
    details,
    bio: ensureHtml(String(bioRaw ?? "").trim()),
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

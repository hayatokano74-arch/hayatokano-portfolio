/* ── 投稿ページ用のAPI通信関数 ── */

import { type RecentPost, getStoredPin, formatNow, extractTags, uploadSingleImage } from "./post-utils";

/* ── 最近の投稿を取得 ── */
export async function fetchRecentPosts(): Promise<RecentPost[]> {
  const res = await fetch("/api/timeline?limit=20");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/* ── 下書きを取得 ── */
export async function fetchDrafts(): Promise<RecentPost[]> {
  const pin = getStoredPin();
  const res = await fetch("/api/timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "get-drafts", pin }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/* ── PIN検証 ── */
export async function verifyPinApi(pin: string): Promise<boolean> {
  const res = await fetch("/api/timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verify-pin", pin }),
  });
  return res.ok;
}

/* ── 投稿を更新（編集） ── */
export async function updatePost(params: {
  editingId: string;
  pin: string;
  title: string;
  cleanText: string;
  effectiveType: string;
  allTags: string[];
  asDraft: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    pin: params.pin,
    id: params.editingId,
    title: params.title,
    text: params.cleanText,
    type: params.effectiveType,
    tags: params.allTags,
    status: params.asDraft ? "draft" : "publish",
  };
  const res = await fetch("/api/timeline", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, error: err.error ?? "更新に失敗しました" };
}

/* ── 新規投稿を作成 ── */
export async function createPost(params: {
  pin: string;
  title: string;
  cleanText: string;
  effectiveType: string;
  allTags: string[];
  images: File[];
  asDraft: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  /* 画像を1枚ずつアップロード */
  const uploadedImageIds: number[] = [];
  for (let i = 0; i < params.images.length; i++) {
    try {
      const imageId = await uploadSingleImage(params.images[i], params.pin);
      uploadedImageIds.push(imageId);
    } catch (e) {
      return {
        ok: false,
        error: `画像${i + 1}のアップロードに失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`,
      };
    }
  }

  const fd = new FormData();
  fd.append("pin", params.pin);
  if (params.title) fd.append("title", params.title);
  fd.append("text", params.cleanText);
  fd.append("type", params.effectiveType);
  fd.append("date", formatNow());
  if (params.asDraft) fd.append("status", "draft");
  if (params.allTags.length > 0) fd.append("tags", JSON.stringify(params.allTags));
  if (uploadedImageIds.length > 0) fd.append("image_ids", JSON.stringify(uploadedImageIds));

  const res = await fetch("/api/timeline", { method: "POST", body: fd });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, error: err.error ?? "投稿に失敗しました" };
}

/* ── 投稿を削除 ── */
export async function deletePost(id: string): Promise<{ ok: boolean; error?: string }> {
  const pin = getStoredPin();
  const res = await fetch("/api/timeline", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, id }),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, error: err.error ?? "削除に失敗しました" };
}

/* ── 下書きを公開 ── */
export async function publishDraft(id: string): Promise<{ ok: boolean; error?: string }> {
  const pin = getStoredPin();
  const res = await fetch("/api/timeline", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, id, status: "publish" }),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, error: err.error ?? "公開に失敗しました" };
}

/* ── 送信パラメータを組み立てる純粋関数 ── */
export function buildSubmitParams(opts: {
  text: string;
  selectedTags: string[];
  title: string;
  images: File[];
  postType: "text" | "photo";
  editingId: string | null;
}) {
  const { cleanText, tags: inlineTags } = extractTags(opts.text);
  const allTags = [...new Set([...opts.selectedTags, ...inlineTags])];
  const hasContent = !!cleanText.trim() || allTags.length > 0 || opts.images.length > 0 || !!opts.title.trim();
  const effectiveType = opts.images.length > 0 ? "photo" : opts.postType;
  return { cleanText, allTags, hasContent, effectiveType };
}

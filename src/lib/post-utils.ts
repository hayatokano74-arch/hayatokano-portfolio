/* ── 投稿ページ用のユーティリティ関数・型定義 ── */

/* ── 型定義 ── */
export type RecentPost = {
  id: string;
  date: string;
  type: string;
  title?: string;
  text: string;
  tags?: string[];
  status?: string;
};

/* ── 日時フォーマット: "2026.02.13 18:22" ── */
export function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── テキストからタグを抽出 ── */
export function extractTags(text: string): { cleanText: string; tags: string[] } {
  const tagRegex = /#([^\s#]+)/g;
  const tags: string[] = [];
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    tags.push(match[1]);
  }
  const cleanText = text.replace(tagRegex, "").replace(/\s+/g, " ").trim();
  return { cleanText, tags };
}

/* ── 画像圧縮（Vercel 4.5MBボディ制限対策） ── */
export function compressImage(file: File, maxDim = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      /* 長辺がmaxDimを超える場合のみリサイズ */
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas未対応")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("圧縮に失敗しました")),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("画像の読み込みに失敗")); };
    img.src = url;
  });
}

/* ── 画像1枚をWPにアップロード（サーバー経由） ── */
export async function uploadSingleImage(file: File, pin: string): Promise<number> {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append("pin", pin);
  fd.append("action", "upload-image");
  fd.append("image", compressed, file.name.replace(/\.[^.]+$/, ".jpg"));

  const res = await fetch("/api/timeline", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "アップロード失敗" }));
    throw new Error(err.error ?? "アップロード失敗");
  }
  const data = await res.json();
  return data.imageId as number;
}

/* ── PINをlocalStorageから取得 ── */
export function getStoredPin(): string {
  return localStorage.getItem("tl-pin") ?? "";
}

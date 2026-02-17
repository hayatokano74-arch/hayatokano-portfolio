/**
 * Timeline 投稿 API Route
 *
 * GET:    最近の投稿を取得（WPプロキシ）
 * POST:   PIN検証 / 下書き一覧取得 / 画像アップ → WP投稿作成
 * PUT:    投稿の編集（テキスト・タイトル・タグ・ステータス）
 * DELETE: 投稿の削除
 *
 * WP認証情報はサーバーサイドに隠蔽し、クライアントにはPINのみ要求
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/* ── 環境変数 ── */
function getEnv() {
  const pin = process.env.TIMELINE_POST_PIN ?? "";
  const wpBase = (process.env.WP_BASE_URL ?? "").replace(/\/$/, "");
  const wpUser = process.env.WP_APP_USER ?? "";
  const wpPass = process.env.WP_APP_PASSWORD ?? "";
  return { pin, wpBase, wpUser, wpPass };
}

/* WP Basic Auth ヘッダー */
function wpAuthHeader(user: string, pass: string) {
  const encoded = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${encoded}`;
}

/* PIN 検証（タイミング攻撃対策: timingSafeEqual を使用） */
function verifyPin(input: string): boolean {
  const { pin } = getEnv();
  if (!pin) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pin);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* 許可する投稿タイプ */
const ALLOWED_TYPES = ["text", "photo"] as const;

/* 許可する画像 MIME タイプ */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

/* バリデーション定数 */
const MAX_TITLE_LENGTH = 200;
const MAX_TEXT_LENGTH = 10000;
const MAX_TAG_COUNT = 20;
const MAX_TAG_LENGTH = 50;
const MAX_IMAGE_COUNT = 10;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; /* 20MB */

/* ── GET: 最近の投稿取得 ── */
export async function GET(request: NextRequest) {
  const { wpBase } = getEnv();
  if (!wpBase) {
    return NextResponse.json({ error: "WP未設定" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5", 10), 20);

  try {
    const res = await fetch(
      `${wpBase}/wp-json/hayato/v1/timeline`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "WP取得失敗", status: res.status, detail: errBody.slice(0, 200) },
        { status: 502 },
      );
    }
    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, limit) : [];
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "WP接続エラー" }, { status: 502 });
  }
}

/* ── POST: 投稿作成 or PIN検証 ── */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  /* JSON リクエスト: PIN検証 or 下書き一覧取得 */
  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (body.action === "verify-pin") {
      if (verifyPin(body.pin ?? "")) {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
    }
    if (body.action === "get-drafts") {
      if (!verifyPin(body.pin ?? "")) {
        return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
      }
      const { wpBase, wpUser, wpPass } = getEnv();
      if (!wpBase || !wpUser || !wpPass) {
        return NextResponse.json({ error: "WP認証未設定" }, { status: 500 });
      }
      try {
        const res = await fetch(`${wpBase}/wp-json/hayato/v1/timeline/drafts`, {
          headers: { Authorization: wpAuthHeader(wpUser, wpPass) },
          next: { revalidate: 0 },
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          return NextResponse.json(
            { error: "下書き取得失敗", status: res.status, detail: errBody.slice(0, 200) },
            { status: 502 },
          );
        }
        const data = await res.json();
        return NextResponse.json(Array.isArray(data) ? data : []);
      } catch {
        return NextResponse.json({ error: "WP接続エラー" }, { status: 502 });
      }
    }
    return NextResponse.json({ error: "不明なアクション" }, { status: 400 });
  }

  /* FormData リクエスト: 画像アップロード or 投稿作成 */
  if (contentType.includes("multipart/form-data")) {
    const { wpBase, wpUser, wpPass } = getEnv();
    if (!wpBase || !wpUser || !wpPass) {
      return NextResponse.json({ error: "WP認証未設定" }, { status: 500 });
    }

    const formData = await request.formData();
    const pin = formData.get("pin") as string;

    /* PIN検証 */
    if (!verifyPin(pin ?? "")) {
      return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
    }

    const action = formData.get("action") as string | null;

    /* ── 画像単体アップロード（Vercel 4.5MBボディ制限対策: 1枚ずつ送信） ── */
    if (action === "upload-image") {
      const image = formData.get("image") as File | null;
      if (!image || image.size === 0) {
        return NextResponse.json({ error: "画像が必要です" }, { status: 400 });
      }
      if (image.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "画像サイズが大きすぎます（20MB以内）" }, { status: 400 });
      }
      if (image.type && !ALLOWED_IMAGE_TYPES.includes(image.type)) {
        return NextResponse.json({ error: `許可されていない画像形式です: ${image.type}` }, { status: 400 });
      }

      try {
        const imgBuffer = Buffer.from(await image.arrayBuffer());
        const uploadRes = await fetch(`${wpBase}/wp-json/wp/v2/media`, {
          method: "POST",
          headers: {
            Authorization: wpAuthHeader(wpUser, wpPass),
            "Content-Disposition": `attachment; filename="${encodeURIComponent(image.name || "image.jpg")}"`,
            "Content-Type": image.type || "image/jpeg",
          },
          body: imgBuffer,
        });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          console.error("画像アップロード失敗:", uploadRes.status, errText.slice(0, 200));
          return NextResponse.json(
            { error: "画像アップロードに失敗しました" },
            { status: 502 },
          );
        }
        const media = await uploadRes.json();
        return NextResponse.json({ ok: true, imageId: media.id });
      } catch (e) {
        console.error("画像アップロードエラー:", e);
        return NextResponse.json({ error: "画像アップロード中にエラーが発生しました" }, { status: 502 });
      }
    }

    /* ── 投稿作成（画像はimage_idsで受け取り、ファイルは含まない） ── */
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const text = formData.get("text") as string;
    const type = formData.get("type") as string;
    const date = formData.get("date") as string;
    const statusField = formData.get("status") as string | null;
    const tagsRaw = formData.get("tags") as string | null;
    const imageIdsRaw = formData.get("image_ids") as string | null;

    /* タイプのバリデーション */
    if (!ALLOWED_TYPES.includes(type as typeof ALLOWED_TYPES[number])) {
      return NextResponse.json({ error: "不正な投稿タイプです" }, { status: 400 });
    }

    /* タイトルの長さチェック */
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `タイトルは${MAX_TITLE_LENGTH}文字以内です` }, { status: 400 });
    }

    /* コンテンツ存在チェック: テキスト・タグ・画像ID・タイトルのいずれか1つが必要 */
    const hasTags = tagsRaw ? (() => { try { const p = JSON.parse(tagsRaw); return Array.isArray(p) && p.length > 0; } catch { return false; } })() : false;
    const hasImageIds = imageIdsRaw ? (() => { try { const p = JSON.parse(imageIdsRaw); return Array.isArray(p) && p.length > 0; } catch { return false; } })() : false;
    if (!text?.trim() && !hasTags && !hasImageIds && !title) {
      return NextResponse.json({ error: "テキスト・タグ・画像・タイトルのいずれかが必要です" }, { status: 400 });
    }

    /* テキストの長さチェック */
    if (text && text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `テキストは${MAX_TEXT_LENGTH}文字以内です` }, { status: 400 });
    }

    /* 日付の形式チェック */
    if (date && !/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/.test(date)) {
      return NextResponse.json({ error: "日付の形式が不正です" }, { status: 400 });
    }

    /* WP に投稿作成 */
    try {
      /* タグをパース */
      let tags: string[] = [];
      if (tagsRaw) {
        try {
          const parsed = JSON.parse(tagsRaw);
          if (Array.isArray(parsed)) {
            tags = parsed
              .filter((t: unknown) => typeof t === "string" && (t as string).trim())
              .map((t: string) => t.trim().slice(0, MAX_TAG_LENGTH))
              .slice(0, MAX_TAG_COUNT);
          }
        } catch { /* JSON パース失敗は無視 */ }
      }

      /* 画像IDをパース */
      let imageIds: number[] = [];
      if (imageIdsRaw) {
        try {
          const parsed = JSON.parse(imageIdsRaw);
          if (Array.isArray(parsed)) {
            imageIds = parsed.filter((id: unknown) => typeof id === "number" && (id as number) > 0);
          }
        } catch { /* JSON パース失敗は無視 */ }
      }

      /* type自動判定: 画像があればphoto（WP側のtype別バリデーション対策） */
      const effectiveType = imageIds.length > 0 ? "photo" : (type === "photo" ? "photo" : "text");

      const payload: Record<string, unknown> = {
        text: (text ?? "").trim(),
        type: effectiveType,
        date: date || "",
      };
      if (title) {
        payload.title = title;
      }
      if (tags.length > 0) {
        payload.tags = tags;
      }
      if (imageIds.length > 0) {
        payload.image_ids = imageIds;
      }
      if (statusField === "draft") {
        payload.status = "draft";
      }

      const postRes = await fetch(`${wpBase}/wp-json/hayato/v1/timeline`, {
        method: "POST",
        headers: {
          Authorization: wpAuthHeader(wpUser, wpPass),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        console.error("WP投稿作成失敗:", postRes.status, errText);
        return NextResponse.json(
          { error: "投稿の作成に失敗しました", status: postRes.status, detail: errText.slice(0, 200) },
          { status: 502 },
        );
      }

      const created = await postRes.json();
      return NextResponse.json({ ok: true, post: created });
    } catch (e) {
      console.error("WP投稿作成エラー:", e);
      return NextResponse.json(
        { error: "投稿作成中にエラーが発生しました" },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ error: "不正なリクエスト形式" }, { status: 400 });
}

/* ── 投稿IDからWP数値IDを抽出（"t123" → "123"） ── */
function extractWpId(id: string): string {
  return id.replace(/^t/, "");
}

/* ── PUT: 投稿の編集 ── */
export async function PUT(request: NextRequest) {
  const { wpBase, wpUser, wpPass } = getEnv();
  if (!wpBase || !wpUser || !wpPass) {
    return NextResponse.json({ error: "WP認証未設定" }, { status: 500 });
  }

  const body = await request.json();
  if (!verifyPin(body.pin ?? "")) {
    return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
  }

  const postId = body.id;
  if (!postId) {
    return NextResponse.json({ error: "投稿IDが必要です" }, { status: 400 });
  }

  const wpId = extractWpId(postId);

  /* ペイロード構築 */
  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.text !== undefined) payload.text = String(body.text).trim();
  if (body.type !== undefined) {
    if (!ALLOWED_TYPES.includes(body.type as typeof ALLOWED_TYPES[number])) {
      return NextResponse.json({ error: "不正な投稿タイプです" }, { status: 400 });
    }
    payload.type = body.type;
  }
  if (body.tags !== undefined) {
    if (Array.isArray(body.tags)) {
      payload.tags = body.tags
        .filter((t: unknown) => typeof t === "string" && (t as string).trim())
        .map((t: string) => t.trim().slice(0, MAX_TAG_LENGTH))
        .slice(0, MAX_TAG_COUNT);
    }
  }
  if (body.status !== undefined) {
    if (!["publish", "draft"].includes(body.status)) {
      return NextResponse.json({ error: "不正なステータスです" }, { status: 400 });
    }
    payload.status = body.status;
  }

  try {
    const res = await fetch(`${wpBase}/wp-json/hayato/v1/timeline/${wpId}`, {
      method: "PUT",
      headers: {
        Authorization: wpAuthHeader(wpUser, wpPass),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("WP投稿更新失敗:", res.status, errText);
      return NextResponse.json(
        { error: "投稿の更新に失敗しました", status: res.status, detail: errText.slice(0, 200) },
        { status: 502 },
      );
    }

    const updated = await res.json();
    return NextResponse.json({ ok: true, post: updated });
  } catch (e) {
    console.error("WP投稿更新エラー:", e);
    return NextResponse.json({ error: "投稿更新中にエラーが発生しました" }, { status: 502 });
  }
}

/* ── DELETE: 投稿の削除 ── */
export async function DELETE(request: NextRequest) {
  const { wpBase, wpUser, wpPass } = getEnv();
  if (!wpBase || !wpUser || !wpPass) {
    return NextResponse.json({ error: "WP認証未設定" }, { status: 500 });
  }

  const body = await request.json();
  if (!verifyPin(body.pin ?? "")) {
    return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
  }

  const postId = body.id;
  if (!postId) {
    return NextResponse.json({ error: "投稿IDが必要です" }, { status: 400 });
  }

  const wpId = extractWpId(postId);

  try {
    const res = await fetch(`${wpBase}/wp-json/hayato/v1/timeline/${wpId}`, {
      method: "DELETE",
      headers: {
        Authorization: wpAuthHeader(wpUser, wpPass),
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("WP投稿削除失敗:", res.status, errText);
      return NextResponse.json(
        { error: "投稿の削除に失敗しました", status: res.status, detail: errText.slice(0, 200) },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("WP投稿削除エラー:", e);
    return NextResponse.json({ error: "投稿削除中にエラーが発生しました" }, { status: 502 });
  }
}

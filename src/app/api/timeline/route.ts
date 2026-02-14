/**
 * Timeline 投稿 API Route
 *
 * POST: PIN検証 → 画像アップ（任意）→ WP投稿作成
 * GET:  最近の投稿を取得（WPプロキシ）
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

  /* JSON リクエスト: PIN検証のみ */
  if (contentType.includes("application/json")) {
    const body = await request.json();
    if (body.action === "verify-pin") {
      if (verifyPin(body.pin ?? "")) {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
    }
    return NextResponse.json({ error: "不明なアクション" }, { status: 400 });
  }

  /* FormData リクエスト: 投稿作成 */
  if (contentType.includes("multipart/form-data")) {
    const { wpBase, wpUser, wpPass } = getEnv();
    if (!wpBase || !wpUser || !wpPass) {
      return NextResponse.json({ error: "WP認証未設定" }, { status: 500 });
    }

    const formData = await request.formData();
    const pin = formData.get("pin") as string;
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const text = formData.get("text") as string;
    const type = formData.get("type") as string;
    const date = formData.get("date") as string;
    const images = formData.getAll("image") as File[];
    const tagsRaw = formData.get("tags") as string | null;

    /* PIN検証 */
    if (!verifyPin(pin ?? "")) {
      return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
    }

    /* タイプのバリデーション */
    if (!ALLOWED_TYPES.includes(type as typeof ALLOWED_TYPES[number])) {
      return NextResponse.json({ error: "不正な投稿タイプです" }, { status: 400 });
    }

    /* タイトルの長さチェック */
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `タイトルは${MAX_TITLE_LENGTH}文字以内です` }, { status: 400 });
    }

    /* テキスト必須チェック: photo タイプはテキスト任意 */
    const isPhoto = type === "photo";
    if (!isPhoto && !text?.trim()) {
      return NextResponse.json({ error: "テキストは必須です" }, { status: 400 });
    }

    /* テキストの長さチェック */
    if (text && text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `テキストは${MAX_TEXT_LENGTH}文字以内です` }, { status: 400 });
    }

    /* 日付の形式チェック */
    if (date && !/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/.test(date)) {
      return NextResponse.json({ error: "日付の形式が不正です" }, { status: 400 });
    }

    /* 複数画像アップロード */
    const imageIds: number[] = [];
    const validImages = images.filter((f) => f && f.size > 0);

    /* 画像数チェック */
    if (validImages.length > MAX_IMAGE_COUNT) {
      return NextResponse.json({ error: `画像は${MAX_IMAGE_COUNT}枚以内です` }, { status: 400 });
    }

    /* 画像サイズ・MIMEタイプチェック */
    for (const img of validImages) {
      if (img.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "画像サイズが大きすぎます（20MB以内）" }, { status: 400 });
      }
      if (img.type && !ALLOWED_IMAGE_TYPES.includes(img.type)) {
        return NextResponse.json({ error: `許可されていない画像形式です: ${img.type}` }, { status: 400 });
      }
    }

    // async-parallel: 画像アップロードを並列実行（直列 → Promise.allSettled）
    const uploadResults = await Promise.allSettled(
      validImages.map(async (img) => {
        const imgBuffer = Buffer.from(await img.arrayBuffer());
        const uploadRes = await fetch(`${wpBase}/wp-json/wp/v2/media`, {
          method: "POST",
          headers: {
            Authorization: wpAuthHeader(wpUser, wpPass),
            "Content-Disposition": `attachment; filename="${encodeURIComponent(img.name)}"`,
            "Content-Type": img.type || "image/jpeg",
          },
          body: imgBuffer,
        });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`${uploadRes.status}: ${errText}`);
        }
        const media = await uploadRes.json();
        return media.id as number;
      }),
    );

    for (const result of uploadResults) {
      if (result.status === "fulfilled") {
        imageIds.push(result.value);
      } else {
        console.error("画像アップロード失敗:", result.reason);
        return NextResponse.json(
          { error: "画像アップロードに失敗しました" },
          { status: 502 },
        );
      }
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

      const payload: Record<string, unknown> = {
        text: (text ?? "").trim(),
        type: isPhoto ? "photo" : "text",
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

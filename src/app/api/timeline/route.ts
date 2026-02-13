/**
 * Timeline 投稿 API Route
 *
 * POST: PIN検証 → 画像アップ（任意）→ WP投稿作成
 * GET:  最近の投稿を取得（WPプロキシ）
 *
 * WP認証情報はサーバーサイドに隠蔽し、クライアントにはPINのみ要求
 */

import { NextRequest, NextResponse } from "next/server";

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

/* PIN 検証 */
function verifyPin(input: string): boolean {
  const { pin } = getEnv();
  if (!pin) return false;
  return input === pin;
}

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
      return NextResponse.json({ error: "WP取得失敗" }, { status: 502 });
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
    const text = formData.get("text") as string;
    const type = formData.get("type") as string;
    const date = formData.get("date") as string;
    const image = formData.get("image") as File | null;

    /* PIN検証 */
    if (!verifyPin(pin ?? "")) {
      return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: "テキストは必須です" }, { status: 400 });
    }

    let imageId = 0;

    /* 画像アップロード（任意） */
    if (image && image.size > 0) {
      try {
        const imgBuffer = Buffer.from(await image.arrayBuffer());
        const uploadRes = await fetch(`${wpBase}/wp-json/wp/v2/media`, {
          method: "POST",
          headers: {
            Authorization: wpAuthHeader(wpUser, wpPass),
            "Content-Disposition": `attachment; filename="${encodeURIComponent(image.name)}"`,
            "Content-Type": image.type || "image/jpeg",
          },
          body: imgBuffer,
        });

        if (uploadRes.ok) {
          const media = await uploadRes.json();
          imageId = media.id;
        } else {
          const errText = await uploadRes.text();
          console.error("画像アップロード失敗:", uploadRes.status, errText);
          return NextResponse.json(
            { error: "画像アップロードに失敗しました" },
            { status: 502 },
          );
        }
      } catch (e) {
        console.error("画像アップロードエラー:", e);
        return NextResponse.json(
          { error: "画像アップロード中にエラーが発生しました" },
          { status: 502 },
        );
      }
    }

    /* WP に投稿作成 */
    try {
      const payload: Record<string, unknown> = {
        text: text.trim(),
        type: type === "photo" ? "photo" : "text",
        date: date || "",
      };
      if (imageId > 0) {
        payload.image_id = imageId;
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
          { error: "投稿の作成に失敗しました" },
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

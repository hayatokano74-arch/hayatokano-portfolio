import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { clearAllGardenCaches } from "@/lib/garden/reader";

/**
 * Garden 再検証エンドポイント
 *
 * WP投稿の公開/更新時にWordPressから自動で呼び出される。
 * 1. シークレットトークンで認証
 * 2. メモリキャッシュ + ファイルキャッシュを全削除
 * 3. Gardenページを即時再生成
 *
 * 呼び出し方:
 *   POST /api/revalidate/garden?secret=xxx
 *   または
 *   POST /api/revalidate/garden （Authorization: Bearer xxx）
 */
export async function POST(request: NextRequest) {
  // シークレット検証（クエリパラメータ or Authorizationヘッダー）
  const secret =
    request.nextUrl.searchParams.get("secret") ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "認証エラー" }, { status: 401 });
  }

  try {
    // 全キャッシュをクリア（メモリ + ファイル + ノードキャッシュ）
    clearAllGardenCaches();

    // Gardenページを即時再生成
    revalidatePath("/garden", "layout");

    console.log("[Revalidate] Garden キャッシュクリア + 再生成を実行しました");

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      message: "Garden のキャッシュをクリアし、再生成をリクエストしました",
    });
  } catch (err) {
    return NextResponse.json(
      { message: "再検証失敗", error: String(err) },
      { status: 500 },
    );
  }
}

/** GETでも動作するようにする（ブラウザからの手動テスト用） */
export async function GET(request: NextRequest) {
  return POST(request);
}

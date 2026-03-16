import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/** WP から呼び出される Garden 再検証エンドポイント。
 *  secret パラメータで認証し、Garden ページを即時再生成する。 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "認証エラー" }, { status: 401 });
  }

  try {
    revalidatePath("/garden", "layout");
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { message: "再検証失敗", error: String(err) },
      { status: 500 },
    );
  }
}

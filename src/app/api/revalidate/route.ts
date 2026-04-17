import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * On-Demand ISR エンドポイント
 *
 * CMS保存時にこのAPIを叩くことで、該当ページのキャッシュを即時破棄する。
 * Vercelが次のリクエスト時にページを再生成し、最新データが反映される。
 *
 * POST /api/revalidate
 * Header: x-revalidate-secret: <REVALIDATE_SECRET>
 * Body:   { "paths": ["/works", "/me-no-hoshi"] }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const paths: string[] = Array.isArray(body.paths) ? body.paths : ["/"];

    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({ revalidated: true, paths });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

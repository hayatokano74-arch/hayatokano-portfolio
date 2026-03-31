import { NextResponse } from "next/server";

const WP_CONTACT_URL = "https://wp.hayatokano.com/wp-json/hayato/v1/contact";
const CONTACT_SECRET = process.env.CONTACT_SECRET ?? "";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "必須項目が未入力です" }, { status: 400 });
    }

    const res = await fetch(WP_CONTACT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Contact-Secret": CONTACT_SECRET,
      },
      body: JSON.stringify({ name, email, message }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("WP contact error:", err);
      return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

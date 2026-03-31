import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const TO_ADDRESSES = ["hayatokano74@gmail.com", "info@hayatokano.com"];
const FROM_ADDRESS = "contact@hayatokano.com";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "必須項目が未入力です" }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: TO_ADDRESSES,
      replyTo: email,
      subject: `【お問い合わせ】${name} 様より`,
      text: `名前: ${name}\nメール: ${email}\n\n${message}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

import { redirect } from "next/navigation";

/* タイムラインページは非公開 — ホームにリダイレクトして API コールを発生させない */
export default function TimelinePage() {
  redirect("/");
}

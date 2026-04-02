export const dynamic = 'force-static'
/* RSS 2.0 フィード生成 */

import { getAllNodes } from "@/lib/garden/reader";

const BASE_URL = "https://hayatokano.com";
const FEED_TITLE = "Hayato Kano Garden";
const FEED_DESCRIPTION = "Hayato Kano のデジタルガーデン。写真・映像・日々の記録。";

/* ISR: 1時間キャッシュ */
export const revalidate = 3600;

/** XMLの特殊文字をエスケープ */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let nodes: Awaited<ReturnType<typeof getAllNodes>>;
  try {
    nodes = await getAllNodes();
  } catch {
    nodes = [];
  }

  /* 最新50件のみ */
  const latest = nodes.slice(0, 50);

  const items = latest
    .map((node) => {
      const url = `${BASE_URL}/garden/${encodeURIComponent(node.slug)}`;
      return `    <item>
      <title>${escapeXml(node.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(node.date).toUTCString()}</pubDate>
      <description>${escapeXml(node.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${BASE_URL}/garden</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>ja</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}

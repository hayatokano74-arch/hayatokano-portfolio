import type { Metadata } from "next";
import { Suspense } from "react";
import { IBM_Plex_Sans_JP } from "next/font/google";
import { ThemeScript } from "@/components/ThemeToggle";
import { GridDebugOverlay } from "@/components/GridDebugOverlay";
import { CustomScrollbar } from "@/components/CustomScrollbar";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

/* 和文: IBM Plex Sans JP（合理的・技術的） */
const ibmPlexSansJP = IBM_Plex_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jp",
  weight: ["400", "500", "700"],
});

const siteName = "Hayato Kano";
const siteDescription = "Hayato Kano — Photographer / Visual Artist";

export const metadata: Metadata = {
  metadataBase: new URL("https://hayatokano.com"),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName,
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={ibmPlexSansJP.variable} suppressHydrationWarning>
      <head>
        {/* 画像ドメインへの接続を事前確立（DNS + TCP + TLS で 100-300ms 短縮） */}
        <link rel="preconnect" href="https://media.hayatokano.com" />
        <link rel="dns-prefetch" href="https://media.hayatokano.com" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="Hayato Kano Garden" />
        <ThemeScript />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <a href="#main-content" className="skip-nav">
          メインコンテンツへ
        </a>
        {children}
        <CustomScrollbar />
        <GridDebugOverlay />
        <Analytics />
        <SpeedInsights />
        {/* Service Worker + スクロールバー自動表示 */}
        <script
          dangerouslySetInnerHTML={{
            __html: [
              // Service Worker 登録
              `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js")})}`,
              // スクロール時だけスクロールバーを表示（html.is-scrolling）
              `(function(){var t,h=document.documentElement;window.addEventListener("scroll",function(){h.classList.add("is-scrolling");clearTimeout(t);t=setTimeout(function(){h.classList.remove("is-scrolling")},1200)},{passive:true})})()`,
            ].join(";"),
          }}
        />
      </body>
    </html>
  );
}

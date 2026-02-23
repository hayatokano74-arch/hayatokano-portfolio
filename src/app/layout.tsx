import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { ThemeScript } from "@/components/ThemeToggle";
import { GridDebugOverlay } from "@/components/GridDebugOverlay";
import "./globals.css";

/* 欧文: Inter（クリーン、モダン） */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/* 和文: Noto Sans JP */
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto",
  weight: ["400", "500", "600", "700", "900"],
});

const siteName = "Hayato Kano";
const siteDescription = "Hayato Kano — Photographer / Visual Artist";

export const metadata: Metadata = {
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
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`} suppressHydrationWarning>
      <head>
        {/* 画像ドメインへの接続を事前確立（DNS + TCP + TLS で 100-300ms 短縮） */}
        <link rel="preconnect" href="https://wp.hayatokano.com" />
        <link rel="dns-prefetch" href="https://wp.hayatokano.com" />
        <ThemeScript />
      </head>
      <body>
        <a href="#main-content" className="skip-nav">
          メインコンテンツへ
        </a>
        {children}
        <GridDebugOverlay />
      </body>
    </html>
  );
}

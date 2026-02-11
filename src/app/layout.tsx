import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { ThemeScript, ThemeToggle } from "@/components/ThemeToggle";
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
      <head><ThemeScript /></head>
      <body>
        {children}
        <div className="theme-switch-wrap"><ThemeToggle /></div>
      </body>
    </html>
  );
}

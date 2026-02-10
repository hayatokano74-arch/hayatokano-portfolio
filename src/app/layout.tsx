import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <body
        style={{
          fontFamily:
            '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic","Noto Sans JP","Meiryo",sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}

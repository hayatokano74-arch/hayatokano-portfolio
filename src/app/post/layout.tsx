import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post",
  robots: { index: false, follow: false },
};

/**
 * /post 専用レイアウト — ヘッダー・フッターなしの軽量シェル
 */
export default function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="post-shell">
      {children}
    </div>
  );
}

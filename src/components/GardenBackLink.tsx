"use client";

import { useRouter } from "next/navigation";

/**
 * Garden 詳細ページの「戻る」リンク
 * ブラウザ履歴がある場合は前のページに戻る（ページ番号を保持）。
 * 直接アクセスの場合は /garden にフォールバック。
 */
export function GardenBackLink() {
  const router = useRouter();

  return (
    <div className="garden-detail-back">
      <button
        type="button"
        className="action-link"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push("/garden");
          }
        }}
        style={{
          border: 0,
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "inherit",
          color: "inherit",
        }}
      >
        ← Garden に戻る
      </button>
    </div>
  );
}

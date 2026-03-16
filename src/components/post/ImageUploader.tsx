"use client";

import { type RefObject } from "react";

/* ── 画像アップロードUI ── */
type ImageUploaderProps = {
  imagePreviews: string[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImagesSelect: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
};

export function ImageUploader({
  imagePreviews,
  fileInputRef,
  onImagesSelect,
  onRemoveImage,
}: ImageUploaderProps) {
  return (
    <div className="post-image-area">
      {imagePreviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {imagePreviews.map((preview, idx) => (
            <div key={idx} className="post-image-preview-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={`プレビュー ${idx + 1}`} className="post-image-preview" />
              <button
                className="post-image-remove"
                onClick={() => onRemoveImage(idx)}
                aria-label={`画像${idx + 1}を削除`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="post-image-drop" style={imagePreviews.length > 0 ? { marginTop: "var(--space-3)" } : undefined}>
        <span>{imagePreviews.length > 0 ? "写真を追加" : "写真を選択"}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            onImagesSelect(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          hidden
        />
      </label>
    </div>
  );
}

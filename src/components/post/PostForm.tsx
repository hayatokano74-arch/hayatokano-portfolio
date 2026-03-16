"use client";

import { type RefObject } from "react";
import { ImageUploader } from "./ImageUploader";

/* ── 投稿フォームUI ── */
type PostFormProps = {
  /* フォーム状態 */
  postType: "text" | "photo";
  setPostType: (v: "text" | "photo") => void;
  title: string;
  setTitle: (v: string) => void;
  text: string;
  setText: (v: string) => void;
  selectedTags: string[];
  pastTags: string[];
  imagePreviews: string[];
  editingId: string | null;
  posting: boolean;
  canPost: boolean;
  /* refs */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  /* アクション */
  onToggleTag: (tag: string) => void;
  onAutoResize: () => void;
  onImagesSelect: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  onClearImages: () => void;
  onSubmit: (asDraft: boolean) => void;
  onCancelEdit: () => void;
};

export function PostForm({
  postType, setPostType, title, setTitle, text, setText,
  selectedTags, pastTags, imagePreviews, editingId, posting, canPost,
  textareaRef, fileInputRef,
  onToggleTag, onAutoResize, onImagesSelect, onRemoveImage, onClearImages,
  onSubmit, onCancelEdit,
}: PostFormProps) {
  return (
    <>
      {/* 編集中ラベル */}
      {editingId && (
        <div className="post-editing-banner">
          編集中: {editingId}
          <button type="button" className="post-btn post-btn-cancel" onClick={onCancelEdit}>
            キャンセル
          </button>
        </div>
      )}

      {/* タイプ切替 */}
      <div className="post-type-toggle">
        <button
          className={`post-type-btn ${postType === "text" ? "active" : ""}`}
          onClick={() => {
            setPostType("text");
            onClearImages();
          }}
        >
          テキスト
        </button>
        <button
          className={`post-type-btn ${postType === "photo" ? "active" : ""}`}
          onClick={() => setPostType("photo")}
        >
          写真
        </button>
      </div>

      {/* タイトル（任意） */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="post-title-input"
        placeholder="タイトル（任意）"
        aria-label="投稿タイトル"
      />

      {/* 選択中のタグ */}
      {selectedTags.length > 0 && (
        <div className="post-selected-tags">
          {selectedTags.map((tag) => (
            <button key={tag} type="button" className="post-tag-pill active" onClick={() => onToggleTag(tag)}>
              #{tag} ×
            </button>
          ))}
        </div>
      )}

      {/* テキストエリア */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); onAutoResize(); }}
        className="post-textarea"
        placeholder={postType === "photo" ? "キャプションを入力… #タグで分類" : "いま何してる？ #タグで分類"}
        rows={3}
      />

      {/* 過去に使ったタグ */}
      {pastTags.length > 0 && (
        <div className="post-past-tags">
          <span className="post-past-tags-label">タグ</span>
          <div className="post-past-tags-list">
            {pastTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`post-tag-pill ${selectedTags.includes(tag) ? "active" : ""}`}
                onClick={() => onToggleTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 写真選択（新規投稿時のみ） */}
      {postType === "photo" && !editingId && (
        <ImageUploader
          imagePreviews={imagePreviews}
          fileInputRef={fileInputRef}
          onImagesSelect={onImagesSelect}
          onRemoveImage={onRemoveImage}
        />
      )}

      {/* 送信ボタン群 */}
      <div className="post-actions">
        <button
          className="post-btn post-btn-primary post-submit"
          onClick={() => onSubmit(false)}
          disabled={posting || (!editingId && !canPost)}
        >
          {posting ? "送信中…" : editingId ? "更新する" : "投稿する"}
        </button>
        <button
          className="post-btn post-btn-secondary"
          onClick={() => onSubmit(true)}
          disabled={posting || (!canPost && !title.trim())}
        >
          下書き保存
        </button>
      </div>
    </>
  );
}

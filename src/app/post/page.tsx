"use client";

import { usePostForm } from "@/hooks/usePostForm";
import { PinScreen } from "@/components/post/PinScreen";
import { PostForm } from "@/components/post/PostForm";
import { PostList } from "@/components/post/PostList";

/* ── 投稿ページ ── */
export default function PostPage() {
  const form = usePostForm();

  /* PIN未認証時はPIN入力画面を表示 */
  if (!form.authed) {
    return (
      <PinScreen
        pinInput={form.pinInput}
        setPinInput={form.setPinInput}
        pinError={form.pinError}
        pinLoading={form.pinLoading}
        onSubmit={form.verifyPin}
      />
    );
  }

  return (
    <div className="post-main">
      <h1 className="post-title">Timeline Post</h1>

      {/* 成功フィードバック */}
      {form.success && (
        <div className="post-success">{form.successMessage}</div>
      )}

      {/* 投稿フォーム */}
      <PostForm
        postType={form.postType}
        setPostType={form.setPostType}
        title={form.title}
        setTitle={form.setTitle}
        text={form.text}
        setText={form.setText}
        selectedTags={form.selectedTags}
        pastTags={form.pastTags}
        imagePreviews={form.imagePreviews}
        editingId={form.editingId}
        posting={form.posting}
        canPost={form.canPost}
        textareaRef={form.textareaRef}
        fileInputRef={form.fileInputRef}
        onToggleTag={form.toggleTag}
        onAutoResize={form.autoResize}
        onImagesSelect={form.handleImagesSelect}
        onRemoveImage={form.removeImage}
        onClearImages={form.clearImages}
        onSubmit={form.handleSubmit}
        onCancelEdit={form.cancelEdit}
      />

      {/* 投稿一覧 */}
      <PostList
        listTab={form.listTab}
        setListTab={form.setListTab}
        recent={form.recent}
        drafts={form.drafts}
        onEdit={form.startEdit}
        onDelete={form.handleDelete}
        onPublish={form.handlePublish}
        onLoadDrafts={form.loadDrafts}
      />
    </div>
  );
}

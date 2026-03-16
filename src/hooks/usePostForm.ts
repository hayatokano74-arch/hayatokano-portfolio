"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { type RecentPost, extractTags, getStoredPin } from "@/lib/post-utils";
import {
  fetchRecentPosts, fetchDrafts, verifyPinApi,
  updatePost, createPost, deletePost, publishDraft,
  buildSubmitParams,
} from "@/lib/post-api";

/* ── フォーム状態管理Hook ── */
export function usePostForm() {
  /* PIN 認証 */
  const [authed, setAuthed] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  /* 投稿フォーム */
  const [postType, setPostType] = useState<"text" | "photo">("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("投稿しました");

  /* タグ */
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /* 最近の投稿 / 下書き */
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [drafts, setDrafts] = useState<RecentPost[]>([]);
  const [listTab, setListTab] = useState<"recent" | "drafts">("recent");

  /* 編集モード */
  const [editingId, setEditingId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── 派生値 ── */
  const pastTags = useMemo(() => {
    const all = [...recent, ...drafts].flatMap((item) => item.tags ?? []);
    return [...new Set(all)];
  }, [recent, drafts]);

  const { hasText, hasAnyTag } = useMemo(() => {
    const { cleanText, tags: inlineTags } = extractTags(text);
    return {
      hasText: !!cleanText.trim(),
      hasAnyTag: selectedTags.length > 0 || inlineTags.length > 0,
    };
  }, [text, selectedTags]);
  const canPost = hasText || hasAnyTag || images.length > 0;

  /* ── データ読み込み ── */
  const loadRecent = useCallback(async () => {
    try { setRecent(await fetchRecentPosts()); } catch { /* 無視 */ }
  }, []);

  const loadDrafts = useCallback(async () => {
    try { setDrafts(await fetchDrafts()); } catch { /* 無視 */ }
  }, []);

  /* ── PIN検証 ── */
  const verifyPin = useCallback(async (pin: string, silent = false) => {
    if (!silent) setPinLoading(true);
    setPinError("");
    try {
      if (await verifyPinApi(pin)) {
        localStorage.setItem("tl-pin", pin);
        setAuthed(true);
        loadRecent();
        loadDrafts();
      } else if (!silent) {
        setPinError("PINが正しくありません");
      }
    } catch {
      if (!silent) setPinError("接続エラー");
    } finally {
      setPinLoading(false);
    }
  }, [loadRecent, loadDrafts]);

  /* ── localStorage からPIN復元 ── */
  useEffect(() => {
    const saved = localStorage.getItem("tl-pin");
    if (saved) verifyPin(saved, true);
  }, [verifyPin]);

  /* ── フォーム操作 ── */
  function handleImagesSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setImages((prev) => [...prev, ...newFiles]);
    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearImages() {
    setImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function autoResize() {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function resetForm() {
    setTitle(""); setText(""); setImages([]); setImagePreviews([]);
    setPostType("text"); setSelectedTags([]); setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(item: RecentPost) {
    setEditingId(item.id);
    setTitle(item.title ?? "");
    setText(item.text);
    setPostType(item.type === "photo" ? "photo" : "text");
    setSelectedTags(item.tags ?? []);
    clearImages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() { resetForm(); }

  function showSuccess(msg: string) {
    setSuccessMessage(msg); setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  /* ── 送信・削除・公開 ── */
  async function handleSubmit(asDraft = false) {
    const params = buildSubmitParams({ text, selectedTags, title, images, postType, editingId });
    if (!editingId && !params.hasContent) return;

    setPosting(true);
    const pin = getStoredPin();
    try {
      const result = editingId
        ? await updatePost({ editingId, pin, title: title.trim(), cleanText: params.cleanText, effectiveType: params.effectiveType, allTags: params.allTags, asDraft })
        : await createPost({ pin, title: title.trim(), cleanText: params.cleanText, effectiveType: params.effectiveType, allTags: params.allTags, images, asDraft });

      if (result.ok) {
        resetForm(); loadRecent(); loadDrafts();
        const msg = editingId
          ? (asDraft ? "下書きに保存しました" : "更新しました")
          : (asDraft ? "下書きに保存しました" : "投稿しました");
        showSuccess(msg);
      } else {
        alert(result.error);
      }
    } catch {
      alert("接続エラーが発生しました");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この投稿を削除しますか？")) return;
    try {
      const result = await deletePost(id);
      if (result.ok) {
        loadRecent(); loadDrafts(); showSuccess("削除しました");
        if (editingId === id) resetForm();
      } else { alert(result.error); }
    } catch { alert("接続エラーが発生しました"); }
  }

  async function handlePublish(item: RecentPost) {
    try {
      const result = await publishDraft(item.id);
      if (result.ok) { loadRecent(); loadDrafts(); showSuccess("公開しました"); }
      else { alert(result.error); }
    } catch { alert("接続エラーが発生しました"); }
  }

  return {
    authed, pinInput, setPinInput, pinError, pinLoading, verifyPin,
    postType, setPostType, title, setTitle, text, setText,
    images, imagePreviews, posting, success, successMessage,
    selectedTags, editingId, canPost,
    recent, drafts, listTab, setListTab, pastTags,
    textareaRef, fileInputRef,
    handleImagesSelect, removeImage, clearImages, autoResize, toggleTag,
    startEdit, cancelEdit, handleSubmit, handleDelete, handlePublish,
    loadDrafts,
  };
}

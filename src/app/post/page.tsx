"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ── 型定義 ── */
type RecentPost = {
  id: string;
  date: string;
  type: string;
  title?: string;
  text: string;
  tags?: string[];
  status?: string;
};

/* ── 日時フォーマット: "2026.02.13 18:22" ── */
function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── テキストからタグを抽出 ── */
function extractTags(text: string): { cleanText: string; tags: string[] } {
  const tagRegex = /#([^\s#]+)/g;
  const tags: string[] = [];
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    tags.push(match[1]);
  }
  const cleanText = text.replace(tagRegex, "").replace(/\s+/g, " ").trim();
  return { cleanText, tags };
}

/* ============================
   メインコンポーネント
   ============================ */
export default function PostPage() {
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

  /* ── 過去に使ったタグ一覧（重複排除） ── */
  const pastTags = useMemo(() => {
    const all = [...recent, ...drafts].flatMap((item) => item.tags ?? []);
    return [...new Set(all)];
  }, [recent, drafts]);

  /* ── 投稿可能判定: テキスト・タグ・画像のいずれか1つがあればOK ── */
  const { hasText, hasAnyTag } = useMemo(() => {
    const { cleanText, tags: inlineTags } = extractTags(text);
    return {
      hasText: !!cleanText.trim(),
      hasAnyTag: selectedTags.length > 0 || inlineTags.length > 0,
    };
  }, [text, selectedTags]);
  const hasImages = images.length > 0;
  const canPost = hasText || hasAnyTag || hasImages;

  /* ── 最近の投稿を読み込み ── */
  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/timeline?limit=20");
      if (res.ok) {
        const data = await res.json();
        setRecent(Array.isArray(data) ? data : []);
      }
    } catch { /* 無視 */ }
  }, []);

  /* ── 下書きを読み込み ── */
  const loadDrafts = useCallback(async () => {
    const pin = localStorage.getItem("tl-pin") ?? "";
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-drafts", pin }),
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(Array.isArray(data) ? data : []);
      }
    } catch { /* 無視 */ }
  }, []);

  /* ── PIN検証 ── */
  const verifyPin = useCallback(async (pin: string, silent = false) => {
    if (!silent) setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-pin", pin }),
      });
      if (res.ok) {
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
    if (saved) {
      verifyPin(saved, true);
    }
  }, [verifyPin]);

  /* ── 画像選択（複数対応） ── */
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

  /* ── テキストエリア自動拡張 ── */
  function autoResize() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }

  /* ── タグのトグル ── */
  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  /* ── フォームリセット ── */
  function resetForm() {
    setTitle("");
    setText("");
    setImages([]);
    setImagePreviews([]);
    setPostType("text");
    setSelectedTags([]);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ── 編集モード開始 ── */
  function startEdit(item: RecentPost) {
    setEditingId(item.id);
    setTitle(item.title ?? "");
    setText(item.text);
    setPostType(item.type === "photo" ? "photo" : "text");
    setSelectedTags(item.tags ?? []);
    setImages([]);
    setImagePreviews([]);
    /* フォームトップにスクロール */
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── 編集キャンセル ── */
  function cancelEdit() {
    resetForm();
  }

  /* ── 成功表示ヘルパー ── */
  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  /* ── 投稿送信（新規 or 編集） ── */
  async function handleSubmit(asDraft = false) {
    const isPhoto = postType === "photo";

    /* タグ抽出 */
    const { cleanText, tags: inlineTags } = extractTags(text);
    const allTags = [...new Set([...selectedTags, ...inlineTags])];

    /* バリデーション: テキスト・タグ・画像・タイトルのいずれか1つが必要 */
    const hasContent = !!cleanText.trim() || allTags.length > 0 || images.length > 0 || !!title.trim();
    if (!editingId && !hasContent) return;

    setPosting(true);
    const pin = localStorage.getItem("tl-pin") ?? "";

    try {
      if (editingId) {
        /* ── PUT: 編集 ── */
        const payload: Record<string, unknown> = {
          pin,
          id: editingId,
          title: title.trim(),
          text: cleanText,
          type: postType,
          tags: allTags,
        };
        if (asDraft) {
          payload.status = "draft";
        } else {
          payload.status = "publish";
        }

        const res = await fetch("/api/timeline", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          resetForm();
          loadRecent();
          loadDrafts();
          showSuccess(asDraft ? "下書きに保存しました" : "更新しました");
        } else {
          const err = await res.json();
          alert(err.error ?? "更新に失敗しました");
        }
      } else {
        /* ── POST: 新規投稿 ── */
        const fd = new FormData();
        fd.append("pin", pin);
        if (title.trim()) fd.append("title", title.trim());
        fd.append("text", cleanText);
        fd.append("type", postType);
        fd.append("date", formatNow());
        if (asDraft) fd.append("status", "draft");
        if (allTags.length > 0) {
          fd.append("tags", JSON.stringify(allTags));
        }
        for (const img of images) {
          fd.append("image", img);
        }

        const res = await fetch("/api/timeline", {
          method: "POST",
          body: fd,
        });
        if (res.ok) {
          resetForm();
          loadRecent();
          loadDrafts();
          showSuccess(asDraft ? "下書きに保存しました" : "投稿しました");
        } else {
          const err = await res.json();
          alert(err.error ?? "投稿に失敗しました");
        }
      }
    } catch {
      alert("接続エラーが発生しました");
    } finally {
      setPosting(false);
    }
  }

  /* ── 投稿を削除 ── */
  async function handleDelete(id: string) {
    if (!confirm("この投稿を削除しますか？")) return;
    const pin = localStorage.getItem("tl-pin") ?? "";
    try {
      const res = await fetch("/api/timeline", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, id }),
      });
      if (res.ok) {
        loadRecent();
        loadDrafts();
        showSuccess("削除しました");
        if (editingId === id) resetForm();
      } else {
        const err = await res.json();
        alert(err.error ?? "削除に失敗しました");
      }
    } catch {
      alert("接続エラーが発生しました");
    }
  }

  /* ── 下書きを公開 ── */
  async function handlePublish(item: RecentPost) {
    const pin = localStorage.getItem("tl-pin") ?? "";
    try {
      const res = await fetch("/api/timeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, id: item.id, status: "publish" }),
      });
      if (res.ok) {
        loadRecent();
        loadDrafts();
        showSuccess("公開しました");
      } else {
        const err = await res.json();
        alert(err.error ?? "公開に失敗しました");
      }
    } catch {
      alert("接続エラーが発生しました");
    }
  }

  /* ============================
     PIN入力画面
     ============================ */
  if (!authed) {
    return (
      <div className="post-pin-screen">
        <h1 className="post-pin-title">Timeline Post</h1>
        <p className="post-pin-desc">PINを入力してください</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyPin(pinInput);
          }}
          className="post-pin-form"
        >
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="post-pin-input"
            placeholder="PIN"
            aria-label="PIN入力"
            autoFocus
          />
          <button
            type="submit"
            disabled={pinLoading || !pinInput}
            className="post-btn post-btn-primary"
          >
            {pinLoading ? "確認中…" : "確認"}
          </button>
        </form>
        {pinError && <p className="post-pin-error">{pinError}</p>}
      </div>
    );
  }

  /* ============================
     投稿フォーム
     ============================ */
  return (
    <div className="post-main">
      <h1 className="post-title">Timeline Post</h1>

      {/* 成功フィードバック */}
      {success && (
        <div className="post-success">{successMessage}</div>
      )}

      {/* 編集中ラベル */}
      {editingId && (
        <div className="post-editing-banner">
          編集中: {editingId}
          <button
            type="button"
            className="post-btn post-btn-cancel"
            onClick={cancelEdit}
          >
            キャンセル
          </button>
        </div>
      )}

      {/* タイプ切替 */}
      <div className="post-type-toggle">
        <button
          className={`post-type-btn ${postType === "text" ? "active" : ""}`}
          onClick={() => setPostType("text")}
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
            <button
              key={tag}
              type="button"
              className="post-tag-pill active"
              onClick={() => toggleTag(tag)}
            >
              #{tag} ×
            </button>
          ))}
        </div>
      )}

      {/* テキストエリア */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          autoResize();
        }}
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
                onClick={() => toggleTag(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 写真選択（新規投稿時のみ） */}
      {postType === "photo" && !editingId && (
        <div className="post-image-area">
          {imagePreviews.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="post-image-preview-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={`プレビュー ${idx + 1}`} className="post-image-preview" />
                  <button
                    className="post-image-remove"
                    onClick={() => removeImage(idx)}
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
                handleImagesSelect(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              hidden
            />
          </label>
        </div>
      )}

      {/* 送信ボタン群 */}
      <div className="post-actions">
        <button
          className="post-btn post-btn-primary post-submit"
          onClick={() => handleSubmit(false)}
          disabled={posting || (!editingId && !canPost)}
        >
          {posting ? "送信中…" : editingId ? "更新する" : "投稿する"}
        </button>
        <button
          className="post-btn post-btn-secondary"
          onClick={() => handleSubmit(true)}
          disabled={posting || (!canPost && !title.trim())}
        >
          下書き保存
        </button>
      </div>

      {/* ── 投稿一覧タブ ── */}
      <div className="post-list-tabs">
        <button
          className={`post-list-tab ${listTab === "recent" ? "active" : ""}`}
          onClick={() => setListTab("recent")}
        >
          最近の投稿
        </button>
        <button
          className={`post-list-tab ${listTab === "drafts" ? "active" : ""}`}
          onClick={() => { setListTab("drafts"); loadDrafts(); }}
        >
          下書き
        </button>
      </div>

      {/* ── 最近の投稿一覧 ── */}
      {listTab === "recent" && recent.length > 0 && (
        <div className="post-recent">
          <ul className="post-recent-list">
            {recent.map((item) => (
              <li key={item.id} className="post-recent-item">
                <div className="post-recent-header">
                  <span className="post-recent-date">{item.date}</span>
                  <span className="post-recent-type">{item.type}</span>
                  {item.tags && item.tags.length > 0 && (
                    <span className="post-recent-tags">
                      {item.tags.map((t) => `#${t}`).join(" ")}
                    </span>
                  )}
                </div>
                {item.title && (
                  <p className="post-recent-item-title">{item.title}</p>
                )}
                <p className="post-recent-text">{item.text}</p>
                <div className="post-item-actions">
                  <button
                    type="button"
                    className="post-btn post-btn-small"
                    onClick={() => startEdit(item)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="post-btn post-btn-small post-btn-danger"
                    onClick={() => handleDelete(item.id)}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {listTab === "recent" && recent.length === 0 && (
        <p className="post-empty-message">投稿がありません</p>
      )}

      {/* ── 下書き一覧 ── */}
      {listTab === "drafts" && drafts.length > 0 && (
        <div className="post-recent">
          <ul className="post-recent-list">
            {drafts.map((item) => (
              <li key={item.id} className="post-recent-item">
                <div className="post-recent-header">
                  <span className="post-recent-date">{item.date}</span>
                  <span className="post-recent-type">{item.type}</span>
                  <span className="post-recent-draft-badge">下書き</span>
                  {item.tags && item.tags.length > 0 && (
                    <span className="post-recent-tags">
                      {item.tags.map((t) => `#${t}`).join(" ")}
                    </span>
                  )}
                </div>
                {item.title && (
                  <p className="post-recent-item-title">{item.title}</p>
                )}
                <p className="post-recent-text">{item.text}</p>
                <div className="post-item-actions">
                  <button
                    type="button"
                    className="post-btn post-btn-small post-btn-publish"
                    onClick={() => handlePublish(item)}
                  >
                    公開
                  </button>
                  <button
                    type="button"
                    className="post-btn post-btn-small"
                    onClick={() => startEdit(item)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="post-btn post-btn-small post-btn-danger"
                    onClick={() => handleDelete(item.id)}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {listTab === "drafts" && drafts.length === 0 && (
        <p className="post-empty-message">下書きがありません</p>
      )}
    </div>
  );
}

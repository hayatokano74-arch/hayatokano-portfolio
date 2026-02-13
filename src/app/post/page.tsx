"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── 型定義 ── */
type RecentPost = {
  id: string;
  date: string;
  type: string;
  text: string;
};

/* ── 日時フォーマット: "2026.02.13 18:22" ── */
function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);

  /* 最近の投稿 */
  const [recent, setRecent] = useState<RecentPost[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── 最近の投稿を読み込み ── */
  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/timeline?limit=5");
      if (res.ok) {
        const data = await res.json();
        setRecent(Array.isArray(data) ? data : []);
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
      } else if (!silent) {
        setPinError("PINが正しくありません");
      }
    } catch {
      if (!silent) setPinError("接続エラー");
    } finally {
      setPinLoading(false);
    }
  }, [loadRecent]);

  /* ── localStorage からPIN復元 ── */
  useEffect(() => {
    const saved = localStorage.getItem("tl-pin");
    if (saved) {
      verifyPin(saved, true);
    }
  }, [verifyPin]);

  /* ── 画像選択 ── */
  function handleImageSelect(file: File | null) {
    if (!file) {
      setImage(null);
      setImagePreview(null);
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* ── テキストエリア自動拡張 ── */
  function autoResize() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }

  /* ── 投稿送信 ── */
  async function handleSubmit() {
    if (!text.trim()) return;
    setPosting(true);

    const pin = localStorage.getItem("tl-pin") ?? "";
    const fd = new FormData();
    fd.append("pin", pin);
    fd.append("text", text.trim());
    fd.append("type", postType);
    fd.append("date", formatNow());
    if (image) fd.append("image", image);

    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        setSuccess(true);
        setText("");
        setImage(null);
        setImagePreview(null);
        setPostType("text");
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadRecent();
        setTimeout(() => setSuccess(false), 2000);
      } else {
        const err = await res.json();
        alert(err.error ?? "投稿に失敗しました");
      }
    } catch {
      alert("接続エラーが発生しました");
    } finally {
      setPosting(false);
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
        <div className="post-success">投稿しました</div>
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

      {/* テキストエリア */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          autoResize();
        }}
        className="post-textarea"
        placeholder={postType === "photo" ? "キャプションを入力…" : "いま何してる？"}
        rows={3}
      />

      {/* 写真選択 */}
      {postType === "photo" && (
        <div className="post-image-area">
          {imagePreview ? (
            <div className="post-image-preview-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="プレビュー" className="post-image-preview" />
              <button
                className="post-image-remove"
                onClick={() => {
                  handleImageSelect(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <label className="post-image-drop">
              <span>写真を選択</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
                hidden
              />
            </label>
          )}
        </div>
      )}

      {/* 投稿ボタン */}
      <button
        className="post-btn post-btn-primary post-submit"
        onClick={handleSubmit}
        disabled={posting || !text.trim()}
      >
        {posting ? "投稿中…" : "投稿する"}
      </button>

      {/* 最近の投稿 */}
      {recent.length > 0 && (
        <div className="post-recent">
          <h2 className="post-recent-title">最近の投稿</h2>
          <ul className="post-recent-list">
            {recent.map((item) => (
              <li key={item.id} className="post-recent-item">
                <span className="post-recent-date">{item.date}</span>
                <span className="post-recent-type">{item.type}</span>
                <p className="post-recent-text">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

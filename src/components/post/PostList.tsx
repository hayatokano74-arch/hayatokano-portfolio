"use client";

import { type RecentPost } from "@/lib/post-utils";

/* ── 投稿一覧（最近の投稿 / 下書き） ── */
type PostListProps = {
  listTab: "recent" | "drafts";
  setListTab: (v: "recent" | "drafts") => void;
  recent: RecentPost[];
  drafts: RecentPost[];
  onEdit: (item: RecentPost) => void;
  onDelete: (id: string) => void;
  onPublish: (item: RecentPost) => void;
  onLoadDrafts: () => void;
};

export function PostList({
  listTab, setListTab, recent, drafts,
  onEdit, onDelete, onPublish, onLoadDrafts,
}: PostListProps) {
  return (
    <>
      {/* タブ切替 */}
      <div className="post-list-tabs">
        <button
          className={`post-list-tab ${listTab === "recent" ? "active" : ""}`}
          onClick={() => setListTab("recent")}
        >
          最近の投稿
        </button>
        <button
          className={`post-list-tab ${listTab === "drafts" ? "active" : ""}`}
          onClick={() => { setListTab("drafts"); onLoadDrafts(); }}
        >
          下書き
        </button>
      </div>

      {/* 最近の投稿一覧 */}
      {listTab === "recent" && recent.length > 0 && (
        <div className="post-recent">
          <ul className="post-recent-list">
            {recent.map((item) => (
              <PostItem key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </div>
      )}
      {listTab === "recent" && recent.length === 0 && (
        <p className="post-empty-message">投稿がありません</p>
      )}

      {/* 下書き一覧 */}
      {listTab === "drafts" && drafts.length > 0 && (
        <div className="post-recent">
          <ul className="post-recent-list">
            {drafts.map((item) => (
              <PostItem key={item.id} item={item} isDraft onEdit={onEdit} onDelete={onDelete} onPublish={onPublish} />
            ))}
          </ul>
        </div>
      )}
      {listTab === "drafts" && drafts.length === 0 && (
        <p className="post-empty-message">下書きがありません</p>
      )}
    </>
  );
}

/* ── 投稿アイテム（1件分） ── */
type PostItemProps = {
  item: RecentPost;
  isDraft?: boolean;
  onEdit: (item: RecentPost) => void;
  onDelete: (id: string) => void;
  onPublish?: (item: RecentPost) => void;
};

function PostItem({ item, isDraft, onEdit, onDelete, onPublish }: PostItemProps) {
  return (
    <li className="post-recent-item">
      <div className="post-recent-header">
        <span className="post-recent-date">{item.date}</span>
        <span className="post-recent-type">{item.type}</span>
        {isDraft && <span className="post-recent-draft-badge">下書き</span>}
        {item.tags && item.tags.length > 0 && (
          <span className="post-recent-tags">
            {item.tags.map((t) => `#${t}`).join(" ")}
          </span>
        )}
      </div>
      {item.title && <p className="post-recent-item-title">{item.title}</p>}
      <p className="post-recent-text">{item.text}</p>
      <div className="post-item-actions">
        {isDraft && onPublish && (
          <button type="button" className="post-btn post-btn-small post-btn-publish" onClick={() => onPublish(item)}>
            公開
          </button>
        )}
        <button type="button" className="post-btn post-btn-small" onClick={() => onEdit(item)}>
          編集
        </button>
        <button type="button" className="post-btn post-btn-small post-btn-danger" onClick={() => onDelete(item.id)}>
          削除
        </button>
      </div>
    </li>
  );
}

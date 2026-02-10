/* ページ遷移時にフェードインアニメーションを適用する template */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}

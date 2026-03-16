/** 三角形アイコン（アーカイブツリーの開閉用） */
export function ToggleArrow({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 8,
        fontSize: 8,
        lineHeight: 1,
        transition: "transform 120ms ease",
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        color: "var(--muted)",
      }}
    >
      ▶
    </span>
  );
}

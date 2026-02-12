export default function TextDetailLoading() {
  return (
    <div
      style={{
        padding: "var(--pad-x)",
        paddingTop: "var(--pad-y)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      <div style={{ height: 18, width: 120, background: "var(--line)", borderRadius: 2, opacity: 0.5 }} />
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="skeleton-pulse"
          style={{
            height: 14,
            width: `${60 + Math.round(Math.random() * 40)}%`,
            background: "var(--line)",
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export default function WorkDetailLoading() {
  return (
    <div
      style={{
        padding: "var(--pad-x)",
        paddingTop: "var(--pad-y)",
        height: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: "var(--space-6)",
      }}
    >
      <div style={{ height: 18, width: 60, background: "var(--line)", borderRadius: 2, opacity: 0.5 }} />
      <div
        className="skeleton-pulse"
        style={{
          width: "min(100%, 1120px)",
          margin: "0 auto",
          height: "100%",
          background: "var(--line)",
          borderRadius: 2,
        }}
      />
      <div style={{ height: 18, width: 200, background: "var(--line)", borderRadius: 2, opacity: 0.5 }} />
    </div>
  );
}

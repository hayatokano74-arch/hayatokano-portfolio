export default function MeNoHoshiDetailLoading() {
  return (
    <div
      style={{
        padding: "var(--pad-x)",
        paddingTop: "var(--pad-y)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-7)",
      }}
    >
      <div style={{ height: 18, width: 100, background: "var(--line)", borderRadius: 2, opacity: 0.5 }} />
      <div
        className="skeleton-pulse"
        style={{
          width: "100%",
          maxWidth: 920,
          aspectRatio: "16 / 10",
          background: "var(--line)",
          borderRadius: 2,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              height: 14,
              width: `${50 + i * 10}%`,
              background: "var(--line)",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

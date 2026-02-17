export default function WorksLoading() {
  return (
    <div
      style={{
        padding: "var(--pad-x)",
        paddingTop: "var(--pad-y)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <div
        style={{
          height: 18,
          width: 80,
          background: "var(--line)",
          borderRadius: 2,
          opacity: 0.5,
        }}
      />
      <div
        className="works-grid"
        style={{
          gap: "var(--space-5)",
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              background: "var(--line)",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

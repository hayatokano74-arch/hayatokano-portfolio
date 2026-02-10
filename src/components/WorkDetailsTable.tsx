import type { Work } from "@/lib/mock";

export function WorkDetailsTable({ details }: { details: Work["details"] }) {
  const rows = [
    { label: "ARTIST", value: details.artist },
    { label: "PERIOD", value: details.period },
    { label: "VENUE", value: details.venue },
    { label: "HOURS", value: details.hours },
    { label: "CLOSED", value: details.closed },
    { label: "ADMISSION", value: details.admission },
    { label: "ADDRESS", value: details.address },
    { label: "ACCESS", value: details.access },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  const padY = "var(--space-2)";

  return (
    <section>
      <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)", marginBottom: "var(--space-2)" }}>DETAILS</div>
      <div style={{ borderTop: "1px solid #d2d2d2" }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "112px minmax(0,1fr)",
              borderBottom: "1px solid #d2d2d2",
              gap: "var(--space-2)",
              paddingTop: padY,
              paddingBottom: padY,
            }}
          >
            <div style={{ fontSize: "var(--font-meta)", letterSpacing: "0.16em", color: "var(--muted)" }}>{row.label}</div>
            <div style={{ fontSize: "var(--font-body)", lineHeight: "var(--lh-normal)" }}>{row.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


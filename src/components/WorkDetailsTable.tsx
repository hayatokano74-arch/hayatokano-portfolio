import type { Work } from "@/lib/types";

/** URLを検出してリンクに変換 */
function renderValue(value: string) {
  const urlRegex = /(https?:\/\/[^\s,、。]+)/g;
  const parts = value.split(urlRegex);

  if (parts.length === 1) return value;

  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
         style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "3px" }}>
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function WorkDetailsTable({ details }: { details: Work["details"] }) {
  const rows = Object.entries(details)
    .filter(([, value]) => value && String(value).trim())
    .map(([key, value]) => ({
      label: key.toUpperCase().replace(/_/g, " "),
      value: String(value),
    }));

  if (rows.length === 0) return null;

  return (
    <section className="work-details-table">
      <div className="work-details-table-header">DETAILS</div>
      {rows.map((row, i) => (
        <div key={`${row.label}-${i}`} className="work-details-row">
          <div className="work-details-label">{row.label}:</div>
          <div className="work-details-value">{renderValue(row.value)}</div>
        </div>
      ))}
    </section>
  );
}

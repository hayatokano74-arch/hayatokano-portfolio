import type { Work } from "@/lib/types";

export function WorkDetailsTable({ details }: { details: Work["details"] }) {
  /* detailsオブジェクトのキー・バリューをそのまま表示 */
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
          <div className="work-details-value">{row.value}</div>
        </div>
      ))}
    </section>
  );
}

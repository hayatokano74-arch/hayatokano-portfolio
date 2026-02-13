import type { Work } from "@/lib/mock";

export function WorkDetailsTable({ details }: { details: Work["details"] }) {
  const rows = [
    /* 展示情報 */
    { label: "ARTIST", value: details.artist },
    { label: "PERIOD", value: details.period },
    { label: "VENUE", value: details.venue },
    { label: "ADDRESS", value: details.address },
    { label: "ACCESS", value: details.access },
    { label: "HOURS", value: details.hours },
    { label: "CLOSED", value: details.closed },
    { label: "ADMISSION", value: details.admission },
    { label: "ORGANIZER", value: details.organizer },
    { label: "CURATOR", value: details.curator },
    /* 作品情報 */
    { label: "MEDIUM", value: details.medium },
    { label: "DIMENSIONS", value: details.dimensions },
    { label: "EDITION", value: details.edition },
    { label: "SERIES", value: details.series },
    /* 出版情報 */
    { label: "PUBLISHER", value: details.publisher },
    { label: "PAGES", value: details.pages },
    { label: "BINDING", value: details.binding },
    { label: "PRICE", value: details.price },
    /* クレジット */
    { label: "PHOTO", value: details.credit_photo },
    { label: "DESIGN", value: details.credit_design },
    { label: "COOPERATION", value: details.credit_cooperation },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <section className="work-details-table">
      <div className="work-details-table-header">DETAILS</div>
      {rows.map((row) => (
        <div key={row.label} className="work-details-row">
          <div className="work-details-label">{row.label}</div>
          <div className="work-details-value">{row.value}</div>
        </div>
      ))}
    </section>
  );
}

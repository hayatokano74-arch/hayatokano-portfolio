import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";

export const metadata: Metadata = { title: "Contact" };

const links = [
  { label: "MAIL", value: "info@hayatokano.com", href: "mailto:info@hayatokano.com" },
  { label: "INSTAGRAM", value: "@hayatokano", href: "https://instagram.com/hayatokano" },
] as const;

export default function ContactPage() {
  return (
    <CanvasShell>
      <Header active="Contact" title="Contact" showCategoryRow={false} />
      <div style={{ marginTop: "var(--space-12)", width: "min(100%, 640px)" }}>
        <div
          style={{
            fontSize: "var(--font-body)",
            lineHeight: "var(--lh-relaxed)",
            fontWeight: 500,
            marginBottom: "var(--space-11)",
          }}
        >
          お仕事のご依頼・お問い合わせは下記よりお願いいたします。
        </div>

        <div className="hrline" />
        {links.map((item) => (
          <div key={item.label}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "112px minmax(0, 1fr)",
                columnGap: "var(--space-6)",
                paddingTop: "var(--space-3)",
                paddingBottom: "var(--space-3)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-meta)",
                  letterSpacing: "0.16em",
                  lineHeight: "var(--lh-normal)",
                  color: "var(--muted)",
                }}
              >
                {item.label}
              </div>
              <a
                href={item.href}
                target={item.href.startsWith("mailto") ? undefined : "_blank"}
                rel={item.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                className="action-link"
                style={{
                  fontSize: "var(--font-body)",
                  lineHeight: "var(--lh-normal)",
                  fontWeight: 700,
                }}
              >
                {item.value}
              </a>
            </div>
            <div className="hrline" />
          </div>
        ))}
      </div>
    </CanvasShell>
  );
}

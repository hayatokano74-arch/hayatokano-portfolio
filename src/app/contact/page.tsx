import type { Metadata } from "next";
import { CanvasShell } from "@/components/CanvasShell";
import { Header } from "@/components/Header";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact" };

const links = [
  { label: "MAIL", value: "info@hayatokano.com", href: "mailto:info@hayatokano.com" },
  { label: "INSTAGRAM", value: "@hayatokano", href: "https://www.instagram.com/_hayatokano/" },
] as const;

export default function ContactPage() {
  return (
    <CanvasShell>
      <Header active="Contact" title="Contact" showCategoryRow={false} />
      {/* 12カラムグリッド: コンテンツは1-7列目 */}
      <div className="contact-layout">
        <div className="contact-content">
          <div
            style={{
              fontSize: "var(--font-body)",
              lineHeight: "var(--lh-relaxed)",
              fontWeight: 500,
              marginBottom: "var(--space-11)",
            }}
          >
            お仕事のご依頼・お問い合わせは下記フォームまたはメールよりお願いいたします。
          </div>

          {/* フォーム */}
          <ContactForm />

          {/* リンク */}
          <div style={{ marginTop: "var(--space-11)" }}>
            <div className="hrline" />
            {links.map((item) => (
              <div key={item.label}>
                <div className="contact-info-row">
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
        </div>
      </div>
    </CanvasShell>
  );
}

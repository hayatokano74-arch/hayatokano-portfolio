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
      <Header active="Contact" title="Contact" showTitleRow={false} showCategoryRow={false} />
      <div className="contact-layout">
        {/* 左カラム: イントロ + 連絡先情報 */}
        <div className="contact-info">
          <p className="contact-intro">
            お仕事のご依頼・お問い合わせは下記フォームまたはメールよりお願いいたします。
          </p>

          <div className="hrline" />

          {links.map((item) => (
            <div key={item.label} className="contact-link-block">
              <div className="contact-link-label">{item.label}</div>
              <a
                href={item.href}
                target={item.href.startsWith("mailto") ? undefined : "_blank"}
                rel={item.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                className="contact-link-value action-link"
              >
                {item.value}
              </a>
            </div>
          ))}
        </div>

        {/* 右カラム: フォーム */}
        <div className="contact-form-area">
          <ContactForm />
        </div>
      </div>
    </CanvasShell>
  );
}

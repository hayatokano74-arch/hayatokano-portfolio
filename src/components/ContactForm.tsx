"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    /* TODO: 実際のAPI送信に置き換え */
    setSent(true);
  };

  if (sent) {
    return (
      <div
        style={{
          fontSize: "var(--font-body)",
          lineHeight: "var(--lh-relaxed)",
          fontWeight: 500,
          paddingTop: "var(--space-8)",
          paddingBottom: "var(--space-8)",
        }}
      >
        お問い合わせありがとうございます。内容を確認のうえ、ご連絡いたします。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      {/* NAME フィールド */}
      <div className={`contact-field${name ? " has-value" : ""}`}>
        <label className="contact-label" htmlFor="contact-name">NAME</label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="contact-input"
        />
      </div>

      {/* EMAIL フィールド */}
      <div className={`contact-field${email ? " has-value" : ""}`}>
        <label className="contact-label" htmlFor="contact-email">EMAIL</label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="contact-input"
        />
      </div>

      {/* MESSAGE フィールド */}
      <div className={`contact-field${message ? " has-value" : ""}`}>
        <label className="contact-label" htmlFor="contact-message">MESSAGE</label>
        <textarea
          id="contact-message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="contact-input contact-textarea"
        />
      </div>

      <button type="submit" className="contact-submit">
        Send
      </button>
    </form>
  );
}

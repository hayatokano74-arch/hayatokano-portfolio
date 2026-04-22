"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div
        role="status"
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
      <div className="contact-field">
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

      <div className="contact-field">
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

      <div className="contact-field">
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

      {status === "error" && (
        <p className="contact-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          送信に失敗しました。時間をおいて再度お試しください。
        </p>
      )}

      <button
        type="submit"
        className="contact-submit"
        disabled={status === "sending"}
        aria-busy={status === "sending"}
      >
        <span className="contact-submit-inner">
          {status === "sending" && (
            <span className="contact-spinner" aria-hidden="true" />
          )}
          {status === "sending" ? "Sending..." : "Send"}
        </span>
      </button>
    </form>
  );
}

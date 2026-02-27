import React from "react";
import { Footer } from "./Footer";

export function CanvasShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="page-shell">
      {children}
      <Footer />
    </main>
  );
}

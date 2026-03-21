import React from "react";
import { Footer } from "./Footer";

export function CanvasShell({ children, footerTopSlot }: { children: React.ReactNode; footerTopSlot?: React.ReactNode }) {
  return (
    <main id="main-content" className="page-shell">
      {children}
      <Footer topSlot={footerTopSlot} />
    </main>
  );
}

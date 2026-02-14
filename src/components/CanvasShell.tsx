import React from "react";

export function CanvasShell({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="page-shell">{children}</main>;
}

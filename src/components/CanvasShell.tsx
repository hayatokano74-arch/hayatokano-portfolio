import React from "react";

export function CanvasShell({ children }: { children: React.ReactNode }) {
  return <main className="page-shell">{children}</main>;
}

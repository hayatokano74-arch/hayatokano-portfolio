"use client";

import React from "react";
import { Footer } from "./Footer";
import { FooterSlotProvider, useFooterSlot } from "./FooterSlotContext";

function GardenShellInner({ children }: { children: React.ReactNode }) {
  const { slot } = useFooterSlot();
  return (
    <main id="main-content" className="page-shell">
      {children}
      <Footer topSlot={slot} />
    </main>
  );
}

export function GardenShell({ children }: { children: React.ReactNode }) {
  return (
    <FooterSlotProvider>
      <GardenShellInner>{children}</GardenShellInner>
    </FooterSlotProvider>
  );
}

"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type React from "react";

const FooterSlotContext = createContext<{
  slot: React.ReactNode;
  setSlot: (node: React.ReactNode) => void;
}>({
  slot: null,
  setSlot: () => {},
});

export function FooterSlotProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlotState] = useState<React.ReactNode>(null);
  const setSlot = useCallback((node: React.ReactNode) => setSlotState(node), []);
  return (
    <FooterSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </FooterSlotContext.Provider>
  );
}

export function useFooterSlot() {
  return useContext(FooterSlotContext);
}

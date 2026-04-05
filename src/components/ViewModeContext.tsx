"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ViewMode = "grid" | "list";

type ViewModeContextValue = {
  view: ViewMode;
  setView: (v: ViewMode) => void;
};

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function readStored(key: string, fallback: ViewMode): ViewMode {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  return v === "grid" || v === "list" ? v : fallback;
}

export function ViewModeProvider({
  storageKey,
  defaultView = "list",
  children,
}: {
  /** localStorage のキー（ページごとに独立させる） */
  storageKey: string;
  defaultView?: ViewMode;
  children: ReactNode;
}) {
  const [view, setViewState] = useState<ViewMode>(() => readStored(storageKey, defaultView));

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    localStorage.setItem(storageKey, v);
  }, [storageKey]);

  return (
    <ViewModeContext.Provider value={{ view, setView }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode は ViewModeProvider 内で使用してください");
  return ctx;
}

"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ViewMode = "grid" | "list";

type ViewModeContextValue = {
  view: ViewMode;
  setView: (v: ViewMode) => void;
};

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

const STORAGE_KEY = "works-view-mode";

function readStored(fallback: ViewMode): ViewMode {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "grid" || v === "list" ? v : fallback;
}

export function ViewModeProvider({
  defaultView = "list",
  children,
}: {
  defaultView?: ViewMode;
  children: ReactNode;
}) {
  const [view, setViewState] = useState<ViewMode>(() => readStored(defaultView));

  const setView = useCallback((v: ViewMode) => {
    setViewState(v);
    localStorage.setItem(STORAGE_KEY, v);
  }, []);

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

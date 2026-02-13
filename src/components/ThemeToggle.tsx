"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/* グローバル状態（複数インスタンスの同期用） */
const listeners = new Set<(t: Theme) => void>();
let currentTheme: Theme | null = null;

function initTheme(): Theme {
  if (currentTheme !== null) return currentTheme;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      currentTheme = stored;
      applyTheme(stored);
      return stored;
    }
  }
  currentTheme = "light";
  return "light";
}

function setGlobalTheme(theme: Theme) {
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  listeners.forEach((fn) => fn(theme));
}

/* フッター右端の小さなスイッチ */
export function ThemeToggle({ forceShow = false }: { forceShow?: boolean } = {}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = initTheme();
    setTheme(t);
    const handler = (next: Theme) => setTheme(next);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setGlobalTheme(next);
  }, [theme]);

  /* 固定表示（layout.tsx）ではトップページ非表示、メニュー内(forceShow)は常に表示 */
  if (!forceShow && pathname === "/") return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="theme-switch"
    >
      {/* トラック */}
      <span className="theme-switch-track">
        {/* つまみ */}
        <span
          className="theme-switch-thumb"
          style={{ transform: isDark ? "translateX(12px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

/* SSR時のちらつき防止スクリプト */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

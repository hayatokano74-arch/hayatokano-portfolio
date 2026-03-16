"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * モバイルメニューの開閉状態を管理するHook
 * パス変更時に自動で閉じる
 */
export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  /* ページ遷移時にメニューを閉じる */
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  return { isOpen, toggle, close } as const;
}

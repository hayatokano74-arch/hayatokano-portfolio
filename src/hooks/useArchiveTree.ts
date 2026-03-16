"use client";

import { useCallback, useMemo, useState } from "react";
import { buildArchiveTree } from "@/lib/timeline-utils";
import type { ArchiveYear } from "@/lib/timeline-utils";

/**
 * アーカイブツリーの構築と開閉状態を管理するカスタムHook
 * ArchiveSidebar と MobileArchiveDrawer で共通利用
 */
export function useArchiveTree(allDates: string[]) {
  const tree = useMemo(() => buildArchiveTree(allDates), [allDates]);

  /* 開閉状態: "2026" や "2026-02" をキーとして管理 */
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree.length > 0) initial.add(tree[0].year);
    return initial;
  });

  const toggle = useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return { tree, openKeys, toggle };
}

export type { ArchiveYear };

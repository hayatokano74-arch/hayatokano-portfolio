"use client";

import { useEffect, useRef } from "react";

/**
 * スワイプジェスチャー Hook
 * - 方向ロック: 初期移動方向を判定し、水平優勢時のみスワイプ扱い
 * - スコープ限定: 指定した要素内のタッチのみ対象
 */
export function useSwipeGesture({
  targetRef,
  enabled,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
}) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const stage = targetRef.current;
    if (!stage) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      /* 方向未確定にリセット */
      isHorizontalSwipe.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      /* 方向が既に確定済みなら再判定しない */
      if (isHorizontalSwipe.current !== null) return;
      if (touchStartX.current === null || touchStartY.current === null) return;

      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      /* 一定距離（10px）動いたら方向を確定 */
      const lockThreshold = 10;
      if (dx >= lockThreshold || dy >= lockThreshold) {
        isHorizontalSwipe.current = dx > dy;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;

      /* 方向ロック: 水平スワイプと判定された場合のみナビゲーション実行 */
      const isHorizontal = isHorizontalSwipe.current === true;
      /* ref をリセット */
      touchStartX.current = null;
      touchStartY.current = null;
      isHorizontalSwipe.current = null;

      if (!isHorizontal) return;

      if (dx > threshold) onSwipeRight();       // 右スワイプ
      else if (dx < -threshold) onSwipeLeft();   // 左スワイプ
    };

    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: true });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, targetRef, onSwipeLeft, onSwipeRight, threshold]);
}

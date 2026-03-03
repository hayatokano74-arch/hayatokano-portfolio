"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * カスタムスクロールバー
 *
 * スクロール開始 → 細い線がふわっと現れる
 * スクロール中   → スクロール位置になめらかに追従（有機的な遅延）
 * スクロール停止 → ゆっくり溶けるように消える
 *
 * レイアウトに影響しないオーバーレイ方式。
 */

const BAR_WIDTH = 3;
const BAR_RADIUS = 1.5;
const RAIL_RIGHT = 4;
const MIN_BAR_HEIGHT = 30;
const FADE_OUT_DELAY = 1000;
/* 追従の滑らかさ（0に近いほど遅延が大きい） */
const LERP_SPEED = 0.12;

export function CustomScrollbar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* 現在の描画状態 */
  const stateRef = useRef({
    opacity: 0,
    /* 実際に描画されているバーのY座標と高さ（補間中の値） */
    currentY: 0,
    currentH: MIN_BAR_HEIGHT,
    /* 目標位置（スクロール位置から計算） */
    targetY: 0,
    targetH: MIN_BAR_HEIGHT,
    /* フェーズ */
    phase: "hidden" as "hidden" | "visible" | "fading",
  });

  /* CSS変数 --accent の色を取得 */
  const getColor = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue("--accent").trim() || "#0066cc";
  }, []);

  /* スクロール位置からバーの目標値を計算 */
  const updateTarget = useCallback(() => {
    const doc = document.documentElement;
    const scrollH = doc.scrollHeight - doc.clientHeight;
    if (scrollH <= 0) return;

    const viewH = doc.clientHeight;
    const ratio = viewH / doc.scrollHeight;
    const barH = Math.max(MIN_BAR_HEIGHT, viewH * ratio);
    const scrollRatio = doc.scrollTop / scrollH;
    const barY = scrollRatio * (viewH - barH);

    stateRef.current.targetY = barY;
    stateRef.current.targetH = barH;
  }, []);

  /* 描画ループ */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    const dpr = window.devicePixelRatio || 1;

    /* Canvas サイズ */
    const canvasW = BAR_WIDTH + RAIL_RIGHT * 2;
    const canvasH = window.innerHeight;
    if (canvas.width !== canvasW * dpr || canvas.height !== canvasH * dpr) {
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      canvas.style.width = `${canvasW}px`;
      canvas.style.height = `${canvasH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, canvasW, canvasH);

    /* 不透明度の更新 */
    if (s.phase === "visible") {
      s.opacity = Math.min(1, s.opacity + 0.08);
    } else if (s.phase === "fading") {
      s.opacity = Math.max(0, s.opacity - 0.02);
      if (s.opacity <= 0) {
        s.phase = "hidden";
      }
    }

    if (s.phase === "hidden") {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    /* 位置のなめらかな補間（lerp） */
    s.currentY += (s.targetY - s.currentY) * LERP_SPEED;
    s.currentH += (s.targetH - s.currentH) * LERP_SPEED;

    /* バー描画 */
    const color = getColor();
    const bx = RAIL_RIGHT;
    const by = s.currentY;
    const bw = BAR_WIDTH;
    const bh = s.currentH;
    const r = BAR_RADIUS;

    ctx.globalAlpha = s.opacity * 0.6;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    rafRef.current = requestAnimationFrame(draw);
  }, [getColor]);

  useEffect(() => {
    const s = stateRef.current;

    /* 初期位置を設定 */
    updateTarget();
    s.currentY = s.targetY;
    s.currentH = s.targetH;

    const onScroll = () => {
      updateTarget();

      if (s.phase === "hidden" || s.phase === "fading") {
        s.phase = "visible";
      }

      /* 停止タイマーリセット */
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (s.phase === "visible") {
          s.phase = "fading";
        }
      }, FADE_OUT_DELAY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(scrollTimerRef.current);
    };
  }, [updateTarget, draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        zIndex: 9998,
        pointerEvents: "none",
      }}
    />
  );
}

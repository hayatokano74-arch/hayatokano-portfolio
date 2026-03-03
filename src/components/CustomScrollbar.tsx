"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * 月の満ち欠けスクロールインジケーター
 *
 * 画面右下に小さな月を表示。
 * ページ上端 = 新月（暗い円） → ページ下端 = 満月（accent色）
 * scrollHeight が変動しても lerp で滑らかに月相が調整される。
 *
 * レイアウトに影響しないオーバーレイ方式。
 */

const MOON_RADIUS = 9;
const MARGIN_RIGHT = 20;
const MARGIN_BOTTOM = 20;

/* 不透明度 */
const DARK_SIDE_OPACITY = 0.07;
const LIT_SIDE_OPACITY = 0.5;

/* タイミング */
const FADE_OUT_DELAY = 1500;
const FADE_IN_SPEED = 0.08;
const FADE_OUT_SPEED = 0.015;
const PHASE_LERP = 0.08;

export function CustomScrollbar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stateRef = useRef({
    opacity: 0,
    currentPhase: 0,
    targetPhase: 0,
    visPhase: "hidden" as "hidden" | "visible" | "fading",
  });

  /* CSS変数から色を取得 */
  const getColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      accent: style.getPropertyValue("--accent").trim() || "#0066cc",
      fg: style.getPropertyValue("--fg").trim() || "#141414",
    };
  }, []);

  /* スクロール位置から月相の目標値を計算 */
  const updateTarget = useCallback(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    stateRef.current.targetPhase =
      scrollable > 0 ? doc.scrollTop / scrollable : 0;
  }, []);

  /**
   * 月を描画
   * phase: 0 = 新月, 0.5 = 半月（右半分）, 1 = 満月
   * 北半球の上弦の月のように右から満ちていく
   */
  const drawMoon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      r: number,
      phase: number,
      litColor: string,
      darkColor: string,
      masterOpacity: number
    ) => {
      /* 暗い側（円のシルエット） */
      ctx.globalAlpha = masterOpacity * DARK_SIDE_OPACITY;
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      /* 新月：これ以上描画不要 */
      if (phase < 0.005) return;

      /* 満月：円全体を明るく */
      if (phase > 0.995) {
        ctx.globalAlpha = masterOpacity * LIT_SIDE_OPACITY;
        ctx.fillStyle = litColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      /* 中間の月相 */
      ctx.globalAlpha = masterOpacity * LIT_SIDE_OPACITY;
      ctx.fillStyle = litColor;
      ctx.beginPath();

      /* 右半球の弧（上→右→下） */
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);

      /* 明暗境界線（ターミネーター）: 楕円弧で月相を表現
         phase < 0.5 → 楕円が右に膨らむ（三日月）
         phase = 0.5 → 直線（半月）
         phase > 0.5 → 楕円が左に膨らむ（十三夜） */
      const ellipseRx = r * Math.abs(1 - 2 * phase);
      const counterclockwise = phase >= 0.5;
      ctx.ellipse(
        cx,
        cy,
        ellipseRx,
        r,
        0,
        Math.PI / 2,
        -Math.PI / 2,
        counterclockwise
      );

      ctx.closePath();
      ctx.fill();
    },
    []
  );

  /* 描画ループ */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    const dpr = window.devicePixelRatio || 1;

    /* Canvas サイズ（月 + 余白） */
    const size = MOON_RADIUS * 2 + 4;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, size, size);

    /* フェード処理 */
    if (s.visPhase === "visible") {
      s.opacity = Math.min(1, s.opacity + FADE_IN_SPEED);
    } else if (s.visPhase === "fading") {
      s.opacity = Math.max(0, s.opacity - FADE_OUT_SPEED);
      if (s.opacity <= 0) s.visPhase = "hidden";
    }

    if (s.visPhase === "hidden") {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    /* 月相の滑らかな補間（lerp） */
    s.currentPhase += (s.targetPhase - s.currentPhase) * PHASE_LERP;

    const { accent, fg } = getColors();
    drawMoon(
      ctx,
      size / 2,
      size / 2,
      MOON_RADIUS,
      s.currentPhase,
      accent,
      fg,
      s.opacity
    );

    ctx.globalAlpha = 1;
    rafRef.current = requestAnimationFrame(draw);
  }, [getColors, drawMoon]);

  useEffect(() => {
    const s = stateRef.current;

    /* 初期位置を設定 */
    updateTarget();
    s.currentPhase = s.targetPhase;

    const onScroll = () => {
      updateTarget();

      if (s.visPhase === "hidden" || s.visPhase === "fading") {
        s.visPhase = "visible";
      }

      /* 停止タイマーリセット */
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (s.visPhase === "visible") s.visPhase = "fading";
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
        bottom: MARGIN_BOTTOM,
        right: MARGIN_RIGHT,
        zIndex: 9998,
        pointerEvents: "none",
      }}
    />
  );
}

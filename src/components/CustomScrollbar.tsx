"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * カスタムスクロールバー（B案: 極細レール + ミニサム）
 *
 * レール: 右端に常時表示される 1px の極薄ライン（ページの長さを暗示）
 * サム:   スクロール中だけ現れる 2px 幅のアクセント色バー
 *         lerp 補間でなめらかに追従し、停止後にフェードアウト
 *
 * レイアウトに影響しないオーバーレイ方式。
 */

/* レール（常時表示の背景ライン） */
const RAIL_WIDTH = 1;
const RAIL_RIGHT_MARGIN = 5;
const RAIL_OPACITY = 0.06;

/* サム（スクロール中のインジケーター） */
const THUMB_WIDTH = 2;
const THUMB_RADIUS = 1;
const MIN_THUMB_HEIGHT = 30;
const THUMB_MAX_OPACITY = 0.7;

/* タイミング */
const FADE_OUT_DELAY = 1200;
const FADE_IN_SPEED = 0.1;
const FADE_OUT_SPEED = 0.015;
/* 追従の滑らかさ（0に近いほど遅延が大きい） */
const LERP_SPEED = 0.12;

export function CustomScrollbar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* 現在の描画状態 */
  const stateRef = useRef({
    thumbOpacity: 0,
    /* 実際に描画されているサムのY座標と高さ（補間中の値） */
    currentY: 0,
    currentH: MIN_THUMB_HEIGHT,
    /* 目標位置（スクロール位置から計算） */
    targetY: 0,
    targetH: MIN_THUMB_HEIGHT,
    /* フェーズ */
    phase: "hidden" as "hidden" | "visible" | "fading",
  });

  /* CSS変数の色を取得 */
  const getColors = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim() || "#0066cc";
    const fg = style.getPropertyValue("--fg").trim() || "#141414";
    return { accent, fg };
  }, []);

  /* スクロール位置からサムの目標値を計算 */
  const updateTarget = useCallback(() => {
    const doc = document.documentElement;
    const scrollH = doc.scrollHeight - doc.clientHeight;
    if (scrollH <= 0) return;

    const viewH = doc.clientHeight;
    const ratio = viewH / doc.scrollHeight;
    const thumbH = Math.max(MIN_THUMB_HEIGHT, viewH * ratio);
    const scrollRatio = doc.scrollTop / scrollH;
    const thumbY = scrollRatio * (viewH - thumbH);

    stateRef.current.targetY = thumbY;
    stateRef.current.targetH = thumbH;
  }, []);

  /* 角丸矩形を描画するヘルパー */
  const drawRoundedRect = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
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

    /* Canvas サイズ（レール + サム + マージンが収まる幅） */
    const canvasW = RAIL_RIGHT_MARGIN + THUMB_WIDTH + 4;
    const canvasH = window.innerHeight;
    if (canvas.width !== canvasW * dpr || canvas.height !== canvasH * dpr) {
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      canvas.style.width = `${canvasW}px`;
      canvas.style.height = `${canvasH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, canvasW, canvasH);

    const { accent, fg } = getColors();

    /* ── レール（常時表示） ── */
    const railX = canvasW - RAIL_RIGHT_MARGIN - RAIL_WIDTH;
    const railTop = 8;
    const railBottom = canvasH - 8;
    ctx.globalAlpha = RAIL_OPACITY;
    ctx.fillStyle = fg;
    ctx.fillRect(railX, railTop, RAIL_WIDTH, railBottom - railTop);

    /* ── サムの不透明度更新 ── */
    if (s.phase === "visible") {
      s.thumbOpacity = Math.min(1, s.thumbOpacity + FADE_IN_SPEED);
    } else if (s.phase === "fading") {
      s.thumbOpacity = Math.max(0, s.thumbOpacity - FADE_OUT_SPEED);
      if (s.thumbOpacity <= 0) {
        s.phase = "hidden";
      }
    }

    /* ── サム描画（スクロール中のみ） ── */
    if (s.phase !== "hidden") {
      /* 位置のなめらかな補間（lerp） */
      s.currentY += (s.targetY - s.currentY) * LERP_SPEED;
      s.currentH += (s.targetH - s.currentH) * LERP_SPEED;

      const thumbX = canvasW - RAIL_RIGHT_MARGIN - THUMB_WIDTH / 2 - RAIL_WIDTH / 2;
      const thumbY = s.currentY;
      const thumbH = s.currentH;

      ctx.globalAlpha = s.thumbOpacity * THUMB_MAX_OPACITY;
      ctx.fillStyle = accent;
      drawRoundedRect(ctx, thumbX, thumbY, THUMB_WIDTH, thumbH, THUMB_RADIUS);
    }

    ctx.globalAlpha = 1;
    rafRef.current = requestAnimationFrame(draw);
  }, [getColors, drawRoundedRect]);

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

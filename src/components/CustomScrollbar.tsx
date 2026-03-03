"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * 結露スクロールバー
 *
 * スクロール開始 → 右端に水滴がランダムに現れ、集まって1本のバーに凝縮
 * スクロール停止 → バーが水滴に分解し、溶けるように消える
 *
 * Canvas で描画。ネイティブスクロールバーは CSS で非表示にする。
 */

/* 水滴1粒のデータ */
type Droplet = {
  /* 現在位置 */
  x: number;
  y: number;
  /* 集合先（バー上の位置） */
  tx: number;
  ty: number;
  /* 散乱時のランダム位置 */
  sx: number;
  sy: number;
  /* 半径 */
  r: number;
  /* 不透明度 */
  alpha: number;
};

const DROPLET_COUNT = 28;
const BAR_WIDTH = 4;
const RAIL_MARGIN = 6; // 右端からの距離
const MIN_BAR_HEIGHT = 30;
const FADE_OUT_DELAY = 1200; // スクロール停止後にフェードアウトするまでの ms

export function CustomScrollbar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropletsRef = useRef<Droplet[]>([]);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<"hidden" | "condensing" | "visible" | "dissolving">("hidden");
  const progressRef = useRef(0); // 0→1 凝縮/溶解の進行度
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const themeRef = useRef<"light" | "dark">("light");

  /* テーマ色の取得 */
  const getColor = useCallback(() => {
    return themeRef.current === "dark" ? "#f5c518" : "#0066cc";
  }, []);

  /* スクロール位置からバーのY座標と高さを計算 */
  const getBarMetrics = useCallback(() => {
    const doc = document.documentElement;
    const scrollH = doc.scrollHeight - doc.clientHeight;
    if (scrollH <= 0) return { barY: 0, barH: 0, viewH: doc.clientHeight };

    const viewH = doc.clientHeight;
    const ratio = viewH / doc.scrollHeight;
    const barH = Math.max(MIN_BAR_HEIGHT, viewH * ratio);
    const scrollRatio = doc.scrollTop / scrollH;
    const barY = scrollRatio * (viewH - barH);

    return { barY, barH, viewH };
  }, []);

  /* 水滴の初期化 */
  const initDroplets = useCallback(() => {
    const { barY, barH, viewH } = getBarMetrics();
    const cx = 0; // Canvas 内でのX中心
    const droplets: Droplet[] = [];

    for (let i = 0; i < DROPLET_COUNT; i++) {
      const t = i / (DROPLET_COUNT - 1);
      // バー上の位置
      const ty = barY + t * barH;
      const tx = cx;
      // 散乱位置（右端付近にランダム）
      const sx = cx + (Math.random() - 0.5) * 20;
      const sy = ty + (Math.random() - 0.5) * viewH * 0.3;
      // 初期サイズ
      const r = 1 + Math.random() * 2.5;

      droplets.push({ x: sx, y: sy, tx, ty, sx, sy, r, alpha: 0 });
    }

    dropletsRef.current = droplets;
  }, [getBarMetrics]);

  /* バー位置を更新（スクロール中に呼ぶ） */
  const updateBarTarget = useCallback(() => {
    const { barY, barH } = getBarMetrics();
    const droplets = dropletsRef.current;
    const cx = 0;

    for (let i = 0; i < droplets.length; i++) {
      const t = i / (droplets.length - 1);
      droplets[i].tx = cx;
      droplets[i].ty = barY + t * barH;
    }
  }, [getBarMetrics]);

  /* 散乱位置を再設定（溶解開始時） */
  const scatterDroplets = useCallback(() => {
    const { viewH } = getBarMetrics();
    const droplets = dropletsRef.current;

    for (const d of droplets) {
      d.sx = d.x + (Math.random() - 0.5) * 24;
      d.sy = d.y + (Math.random() - 0.5) * viewH * 0.15;
    }
  }, [getBarMetrics]);

  /* メインの描画ループ */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const phase = phaseRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Canvas サイズをウィンドウに合わせる
    const w = BAR_WIDTH + RAIL_MARGIN * 2;
    const h = window.innerHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    if (phase === "hidden") {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const droplets = dropletsRef.current;
    const color = getColor();
    const speed = 0.08;

    // 進行度の更新
    if (phase === "condensing" || phase === "visible") {
      progressRef.current = Math.min(1, progressRef.current + speed);
    } else if (phase === "dissolving") {
      progressRef.current = Math.max(0, progressRef.current - speed * 0.5);
      if (progressRef.current <= 0.01) {
        phaseRef.current = "hidden";
        for (const d of droplets) d.alpha = 0;
      }
    }

    const p = progressRef.current;
    // イージング: 凝縮は ease-out、溶解は ease-in
    const easedP =
      phase === "dissolving" ? p * p : 1 - (1 - p) * (1 - p);

    const centerX = RAIL_MARGIN + BAR_WIDTH / 2;

    for (const d of droplets) {
      if (phase === "condensing" || phase === "visible") {
        // 散乱位置 → バー位置へ補間
        d.x = d.sx + (d.tx - d.sx + centerX) * easedP;
        d.y = d.sy + (d.ty - d.sy) * easedP;
        d.alpha = Math.min(1, p * 2); // 素早くフェードイン
      } else if (phase === "dissolving") {
        // バー位置 → 散乱位置へ補間（逆方向）
        d.x = d.sx + (d.tx - d.sx + centerX) * easedP;
        d.y = d.sy + (d.ty - d.sy) * easedP;
        d.alpha = Math.min(1, p * 1.5);
      }

      // 描画
      if (d.alpha > 0.01) {
        ctx.beginPath();
        // 凝縮するほど半径が均一化
        const drawR = d.r * (1 - easedP * 0.5) + BAR_WIDTH / 2 * easedP;
        ctx.arc(d.x, d.y, Math.max(0.5, drawR), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = d.alpha * 0.7;
        ctx.fill();
      }
    }

    // 凝縮しきったら連結線を描く
    if (easedP > 0.7 && phase !== "dissolving") {
      ctx.beginPath();
      ctx.globalAlpha = (easedP - 0.7) / 0.3 * 0.5;
      ctx.lineWidth = BAR_WIDTH;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;

      const sorted = [...droplets].sort((a, b) => a.ty - b.ty);
      ctx.moveTo(sorted[0].x, sorted[0].y);
      for (let i = 1; i < sorted.length; i++) {
        ctx.lineTo(sorted[i].x, sorted[i].y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    rafRef.current = requestAnimationFrame(draw);
  }, [getColor]);

  useEffect(() => {
    // テーマ監視
    const updateTheme = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      themeRef.current = theme === "dark" ? "dark" : "light";
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // 水滴を初期化
    initDroplets();

    // スクロールイベント
    const onScroll = () => {
      const phase = phaseRef.current;

      if (phase === "hidden" || phase === "dissolving") {
        // 新しく凝縮開始
        initDroplets();
        phaseRef.current = "condensing";
        progressRef.current = 0;
      }

      // バー位置を更新
      updateBarTarget();

      // 凝縮済みなら visible へ
      if (phaseRef.current === "condensing" && progressRef.current >= 0.95) {
        phaseRef.current = "visible";
      }

      // 停止タイマーをリセット
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (
          phaseRef.current === "condensing" ||
          phaseRef.current === "visible"
        ) {
          scatterDroplets();
          phaseRef.current = "dissolving";
        }
      }, FADE_OUT_DELAY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // 描画ループ開始
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(scrollTimerRef.current);
      observer.disconnect();
    };
  }, [initDroplets, updateBarTarget, scatterDroplets, draw]);

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

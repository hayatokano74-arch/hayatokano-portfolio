"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * 結露スクロールバー
 *
 * スクロール開始 → 細かい水滴が散らばって現れ、集まって1本のバーに凝縮
 * スクロール中   → きれいな実線バーとして表示
 * スクロール停止 → バーが水滴に分解し、溶けるように消える
 */

/* パーティクル1粒 */
type Particle = {
  /* 散乱位置（ランダム） */
  sx: number;
  sy: number;
  /* 半径 */
  r: number;
  /* 個別の遅延（凝縮・溶解タイミングをずらす） */
  delay: number;
};

const PARTICLE_COUNT = 80;
const BAR_WIDTH = 4;
const BAR_RADIUS = 2;
const RAIL_RIGHT = 6; // 右端からバー中心までの距離
const MIN_BAR_HEIGHT = 30;
const FADE_OUT_DELAY = 1200;

export function CustomScrollbar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<"hidden" | "condensing" | "visible" | "dissolving">("hidden");
  const progressRef = useRef(0);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* CSS変数 --accent の色を取得 */
  const getColor = useCallback(() => {
    const style = getComputedStyle(document.documentElement);
    return style.getPropertyValue("--accent").trim() || "#0066cc";
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

  /* パーティクルを生成 */
  const initParticles = useCallback(() => {
    const { barY, barH, viewH } = getBarMetrics();
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / (PARTICLE_COUNT - 1);
      const baseY = barY + t * barH;
      particles.push({
        /* 散乱位置: バー位置を中心にランダムにばらける */
        sx: (Math.random() - 0.5) * 30,
        sy: baseY + (Math.random() - 0.5) * viewH * 0.25,
        r: 0.5 + Math.random() * 1.5,
        delay: Math.random() * 0.3,
      });
    }

    particlesRef.current = particles;
  }, [getBarMetrics]);

  /* 溶解時に散乱位置をリフレッシュ */
  const refreshScatter = useCallback(() => {
    const { barY, barH, viewH } = getBarMetrics();
    const particles = particlesRef.current;

    for (let i = 0; i < particles.length; i++) {
      const t = i / (particles.length - 1);
      const baseY = barY + t * barH;
      particles[i].sx = (Math.random() - 0.5) * 30;
      particles[i].sy = baseY + (Math.random() - 0.5) * viewH * 0.15;
      particles[i].delay = Math.random() * 0.4;
    }
  }, [getBarMetrics]);

  /* 描画ループ */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const phase = phaseRef.current;
    const dpr = window.devicePixelRatio || 1;

    /* Canvas サイズ */
    const canvasW = BAR_WIDTH + RAIL_RIGHT * 2 + 30; // 散乱分の余裕
    const canvasH = window.innerHeight;
    if (canvas.width !== canvasW * dpr || canvas.height !== canvasH * dpr) {
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
      canvas.style.width = `${canvasW}px`;
      canvas.style.height = `${canvasH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, canvasW, canvasH);

    if (phase === "hidden") {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const color = getColor();
    const { barY, barH } = getBarMetrics();

    /* バーの中心X（Canvas右端からRAIL_RIGHT離れた位置） */
    const barCX = canvasW - RAIL_RIGHT;

    /* --- 進行度の更新 --- */
    const condensSpeed = 0.06;
    const dissolveSpeed = 0.03;

    if (phase === "condensing" || phase === "visible") {
      progressRef.current = Math.min(1, progressRef.current + condensSpeed);
      if (progressRef.current >= 1) phaseRef.current = "visible";
    } else if (phase === "dissolving") {
      progressRef.current = Math.max(0, progressRef.current - dissolveSpeed);
      if (progressRef.current <= 0) {
        phaseRef.current = "hidden";
      }
    }

    const p = progressRef.current;

    /* --- パーティクル描画 --- */
    const particles = particlesRef.current;

    /* パーティクルは凝縮途中と溶解途中にだけ見える */
    const showParticles = p < 1 && (phase === "condensing" || phase === "dissolving");
    if (showParticles) {
      for (const pt of particles) {
        /* 各パーティクルの個別進行度（delay でタイミングをずらす） */
        const localP = Math.max(0, Math.min(1, (p - pt.delay) / (1 - pt.delay)));
        const easedLocal =
          phase === "dissolving"
            ? localP * localP /* ease-in: ゆっくり溶ける */
            : 1 - (1 - localP) * (1 - localP); /* ease-out: すっと集まる */

        /* 散乱位置 → バー中心へ補間 */
        const t = particles.indexOf(pt) / (particles.length - 1);
        const targetY = barY + t * barH;

        const px = barCX + pt.sx * (1 - easedLocal);
        const py = targetY + (pt.sy - targetY) * (1 - easedLocal);

        /* 集まるほど透明に（バーに吸収される演出） */
        const particleAlpha = phase === "dissolving"
          ? (1 - easedLocal) * 0.8
          : (1 - easedLocal) * 0.6;

        if (particleAlpha > 0.01) {
          ctx.beginPath();
          ctx.arc(px, py, pt.r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = particleAlpha;
          ctx.fill();
        }
      }
    }

    /* --- 実線バー描画 --- */
    /* バーの不透明度: 凝縮が進むほど濃くなる */
    const barAlpha = phase === "dissolving"
      ? p * 0.9
      : Math.min(1, p * 1.5) * 0.8;

    if (barAlpha > 0.01) {
      ctx.globalAlpha = barAlpha;
      ctx.fillStyle = color;

      /* 角丸の実線バー */
      const bx = barCX - BAR_WIDTH / 2;
      const by = barY;
      const bw = BAR_WIDTH;
      const bh = barH;
      const r = BAR_RADIUS;

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
    }

    ctx.globalAlpha = 1;
    rafRef.current = requestAnimationFrame(draw);
  }, [getColor, getBarMetrics]);

  useEffect(() => {
    initParticles();

    const onScroll = () => {
      const phase = phaseRef.current;

      if (phase === "hidden" || phase === "dissolving") {
        initParticles();
        phaseRef.current = "condensing";
        progressRef.current = phase === "dissolving" ? progressRef.current : 0;
      }

      /* 停止タイマーリセット */
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (
          phaseRef.current === "condensing" ||
          phaseRef.current === "visible"
        ) {
          refreshScatter();
          phaseRef.current = "dissolving";
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
  }, [initParticles, refreshScatter, draw]);

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

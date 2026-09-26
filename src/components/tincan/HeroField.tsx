"use client";

import { useEffect, useRef } from "react";

/**
 * Grid cell spacing in CSS pixels — gives each glyph slight horizontal
 * breathing room (`- - - < < <`) just like the reference image.
 */
const CELL_W = 12;
const CELL_H = 12;

/**
 * Brush radius bounds:
 * - Single swipe: compact ~25–33px radius (~4–5 rows tall: 2 rows of "<"
 *   wrapped by 1–2 rows of "-").
 * - Repetitive fast back-and-forth / circular motion: expands concentrically
 *   outward up to a strict cap of MAX_EXPANDED_RADIUS (76px), with more "o"
 *   in the center and expanding "<" and "-" rings around it.
 */
const MIN_SWIPE_RADIUS = 25;
const MAX_SWIPE_RADIUS = 33;
const MAX_EXPANDED_RADIUS = 76;

/**
 * Energy thresholds for the 3-character concentric ramp:
 *   "-" (low density)  : [FLOOR_DASH .. THRESH_MID)   -> outer layer & final stage
 *   "<" (mid density)  : [THRESH_MID .. THRESH_HIGH)  -> middle layer & mid stage
 *   "o" (high density) : [THRESH_HIGH .. 1.0]         -> inner core during repetitive/overlapping motion
 */
const FLOOR_DASH = 0.12;
const THRESH_MID = 0.34;
const THRESH_HIGH = 0.68;
const SINGLE_PASS_CAP = 0.58;
const MAX_ENERGY = 1.0;

/** Constant vividness for every visible ASCII character (no opacity fading). */
const UNIFORM_ALPHA = 0.54;

/**
 * Base lifetime (ms) for a cell's residue. Each cell scales this by its own
 * asynchronous rate (`asyncRate`) so cells step through "o" -> "<" -> "-" -> off
 * staggered in time from the oldest tail forward.
 */
const BASE_LIFETIME_MS = 1280;

type Cell = {
  /** Small static spatial jitter so the stepped "-" rows look organic. */
  jitter: number;
  /**
   * Asynchronous decay rate multiplier (0.60 .. 1.48) so neighbouring cells
   * transition stages ("o" -> "<" -> "-" -> empty) asynchronously.
   */
  asyncRate: number;
};

/** Fast deterministic 2D integer hash in [0, 1). */
function hash2d(x: number, y: number, salt = 0): number {
  let n =
    Math.imul(x + 101, 374761393) +
    Math.imul(y + 53, 668265263) +
    Math.imul(salt, 1442695041);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise in [0, 1] with quintic interpolation. */
function valueNoise2D(x: number, y: number, salt: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);

  const n00 = hash2d(xi, yi, salt);
  const n10 = hash2d(xi + 1, yi, salt);
  const n01 = hash2d(xi, yi + 1, salt);
  const n11 = hash2d(xi + 1, yi + 1, salt);

  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return nx0 + (nx1 - nx0) * v;
}

function buildGrid(cols: number, rows: number): Cell[] {
  const cells: Cell[] = new Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;

      const jitter = (hash2d(c, r, 3) - 0.5) * 0.08;
      const cellRand = hash2d(c, r, 6);
      const patchRand = valueNoise2D(c * 0.35, r * 0.35, 19);
      const asyncRate = 0.6 + (cellRand * 0.65 + patchRand * 0.35) * 0.88;

      cells[idx] = {
        jitter,
        asyncRate,
      };
    }
  }

  return cells;
}

/**
 * Evaluates a cell's current stage energy at `now` using its individual
 * `asyncRate` so cells transition across "o" -> "<" -> "-" -> 0 asynchronously
 * while following the trail from oldest tail to newest head.
 */
function currentCellEnergy(
  peak: number,
  touchedAt: number,
  asyncRate: number,
  now: number
): number {
  if (peak <= 0) return 0;
  const effectiveAge = (now - touchedAt) * asyncRate;
  if (effectiveAge <= 0) return peak;
  if (effectiveAge >= BASE_LIFETIME_MS) return 0;

  const u = effectiveAge / BASE_LIFETIME_MS;
  const stageFactor = 1 - u * (0.65 + 0.35 * u);
  return peak * stageFactor;
}

/**
 * Velocity & repetition-driven monochrome ASCII trail:
 * - Single swipe: compact ~4–5 row band with "<" in the inner rows and "-"
 *   wrapping the outer rows/caps.
 * - Repetitive short left-right shakes or tight circles: builds `repeatLevel`
 *   (up to a strict cap), expanding the brush concentrically so "o" forms in
 *   the center while "<" and "-" layers expand outward around it.
 */
export function HeroField() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let grid: Cell[] = [];
    let peakEnergy = new Float32Array(0);
    let touchedAt = new Float64Array(0);
    let lastSeenAt = new Float64Array(0);
    let lastPassId = new Int32Array(0);
    let isVisible = true;

    // Active bounding box in grid coordinates.
    let activeMinC = 0;
    let activeMaxC = -1;
    let activeMinR = 0;
    let activeMaxR = -1;

    let hasPointer = false;
    let pointerInside = false;
    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let lastDepositX = 0;
    let lastDepositY = 0;
    let lastDepositTime = 0;
    let smoothedSpeed = 0;

    // Tracks direction changes and continuous repetitive agitation in [0 .. 1].
    let prevDirX = 0;
    let prevDirY = 0;
    let hasPrevDir = false;
    let accumTurnRad = 0;
    let currentPassId = 1;
    let repeatLevel = 0;
    let smoothedRepeat = 0;

    let lastFrameTime = 0;
    let rafId = 0;

    let glyphStyle = `rgba(160, 160, 160, ${UNIFORM_ALPHA})`;

    const syncPalette = () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      glyphStyle = isLight
        ? `rgba(92, 92, 92, ${UNIFORM_ALPHA})`
        : `rgba(160, 160, 160, ${UNIFORM_ALPHA})`;
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      cols = Math.ceil(width / CELL_W);
      rows = Math.ceil(height / CELL_H);
      grid = buildGrid(cols, rows);
      peakEnergy = new Float32Array(cols * rows);
      touchedAt = new Float64Array(cols * rows);
      lastSeenAt = new Float64Array(cols * rows);
      lastPassId = new Int32Array(cols * rows);
      activeMinC = cols;
      activeMaxC = -1;
      activeMinR = rows;
      activeMaxR = -1;
      syncPalette();
    };

    const depositStamp = (
      cx: number,
      cy: number,
      dirX: number,
      dirY: number,
      speedNorm: number,
      stampTime: number,
      passId: number,
      stepCount: number
    ) => {
      const baseSwipeR =
        MIN_SWIPE_RADIUS + speedNorm * (MAX_SWIPE_RADIUS - MIN_SWIPE_RADIUS);

      // Probe center cell to see if we are crossing over active residue from an earlier pass.
      const centerCol = Math.max(0, Math.min(cols - 1, Math.floor(cx / CELL_W)));
      const centerRow = Math.max(0, Math.min(rows - 1, Math.floor(cy / CELL_H)));
      const centerIdx = centerRow * cols + centerCol;
      const centerExisting = currentCellEnergy(
        peakEnergy[centerIdx],
        touchedAt[centerIdx],
        grid[centerIdx]?.asyncRate ?? 1,
        stampTime
      );
      const centerGap = stampTime - lastSeenAt[centerIdx];
      const centerNewPass =
        lastPassId[centerIdx] !== 0 && lastPassId[centerIdx] !== passId;

      if (centerExisting >= 0.24 && (centerNewPass || centerGap >= 95)) {
        // Divided by stepCount so sub-stepping doesn't spike repeatLevel in one frame.
        const boost =
          ((0.055 + 0.085 * speedNorm) / stepCount) * (centerNewPass ? 1 : 0.7);
        repeatLevel = Math.min(1, repeatLevel + boost);
      }

      // Delayed onset + quadratic ease-in so the growth kicks in later and
      // swells outward gradually rather than ballooning right away.
      const oRep =
        smoothedRepeat > 0.2
          ? Math.pow(Math.min(1, (smoothedRepeat - 0.2) / 0.8), 1.45) *
            (0.55 + 0.45 * speedNorm)
          : 0;
      const expandRep =
        smoothedRepeat > 0.28
          ? Math.pow(Math.min(1, (smoothedRepeat - 0.28) / 0.72), 1.85) *
            (0.5 + 0.5 * speedNorm)
          : 0;

      // Radius expands slowly with sustained repetition up to MAX_EXPANDED_RADIUS (76px).
      const radius = baseSwipeR + expandRep * (MAX_EXPANDED_RADIUS - baseSwipeR);
      const invRadius = 1 / radius;

      const stretch = (1.18 + speedNorm * 0.2) * (1 - expandRep * 0.14);
      const invStretch = 1 / stretch;

      const centerPeak =
        oRep > 0
          ? THRESH_HIGH + 0.02 + oRep * (MAX_ENERGY - THRESH_HIGH - 0.02)
          : SINGLE_PASS_CAP;

      const warpAmp = 15 + expandRep * 18;
      const pad = radius * stretch + warpAmp + 6;
      const c0 = Math.max(0, Math.floor((cx - pad) / CELL_W));
      const c1 = Math.min(cols - 1, Math.ceil((cx + pad) / CELL_W));
      const r0 = Math.max(0, Math.floor((cy - pad) / CELL_H));
      const r1 = Math.min(rows - 1, Math.ceil((cy + pad) / CELL_H));

      if (c0 < activeMinC) activeMinC = c0;
      if (c1 > activeMaxC) activeMaxC = c1;
      if (r0 < activeMinR) activeMinR = r0;
      if (r1 > activeMaxR) activeMaxR = r1;

      const timeSec = stampTime * 0.001;
      const driftX = timeSec * 0.24;
      const driftY = -timeSec * 0.19;

      for (let r = r0; r <= r1; r++) {
        const baseY = r * CELL_H + CELL_H * 0.5;
        const rowOffset = r * cols;

        for (let c = c0; c <= c1; c++) {
          const baseX = c * CELL_W + CELL_W * 0.5;

          const wx =
            (valueNoise2D(baseX * 0.032 + driftX, baseY * 0.032 + driftY, 11) -
              0.5) *
            warpAmp;
          const wy =
            (valueNoise2D(baseX * 0.032 - driftY, baseY * 0.032 + driftX, 23) -
              0.5) *
            warpAmp;

          const dx = baseX + wx - cx;
          const dy = baseY + wy - cy;

          const along = dx * dirX + dy * dirY;
          const perp = -dx * dirY + dy * dirX;
          const effDist = Math.hypot(along * invStretch, perp);
          if (effDist >= radius) continue;

          const idx = rowOffset + c;
          const cell = grid[idx];
          if (!cell) continue;

          const u = Math.max(
            0,
            Math.min(1, 1 - effDist * invRadius + cell.jitter)
          );
          if (u <= 0.03) continue;

          const passEnergy =
            FLOOR_DASH + Math.pow(u, 1.12) * (centerPeak - FLOOR_DASH);

          const existing = currentCellEnergy(
            peakEnergy[idx],
            touchedAt[idx],
            cell.asyncRate,
            stampTime
          );

          lastSeenAt[idx] = stampTime;
          lastPassId[idx] = passId;

          if (passEnergy >= existing) {
            peakEnergy[idx] = passEnergy;
            touchedAt[idx] = stampTime;
          }
        }
      }
    };

    const render = (now: number) => {
      rafId = 0;
      if (!isVisible || reducedMotion.matches) {
        peakEnergy.fill(0);
        repeatLevel = 0;
        smoothedRepeat = 0;
        activeMinC = cols;
        activeMaxC = -1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const dt = lastFrameTime ? Math.min(0.05, (now - lastFrameTime) / 1000) : 1 / 60;
      lastFrameTime = now;
      const frameScale = dt * 60;

      // Natural decay of repetition target when not actively shaking/circling.
      repeatLevel = Math.max(0, repeatLevel - dt * 0.82);

      // Slow, delayed follower so expansion builds up progressively over sustained motion.
      const followRate = repeatLevel > smoothedRepeat ? 2.1 : 2.8;
      smoothedRepeat +=
        (repeatLevel - smoothedRepeat) * Math.min(1, followRate * dt);

      // Follow cursor closely with minimal smoothing.
      const prevX = smoothX;
      const prevY = smoothY;
      const lerpFactor = Math.min(1, 0.48 * frameScale);
      smoothX += (targetX - smoothX) * lerpFactor;
      smoothY += (targetY - smoothY) * lerpFactor;

      const frameDx = smoothX - prevX;
      const frameDy = smoothY - prevY;
      const instSpeed = Math.hypot(frameDx, frameDy) / Math.max(0.5, frameScale);
      smoothedSpeed += (instSpeed - smoothedSpeed) * Math.min(1, 0.35 * frameScale);

      if (pointerInside && hasPointer && smoothedSpeed > 0.3) {
        const segDx = smoothX - lastDepositX;
        const segDy = smoothY - lastDepositY;
        const segDist = Math.hypot(segDx, segDy);

        if (segDist >= 2.0) {
          const dirX = segDx / segDist;
          const dirY = segDy / segDist;
          const speedNorm = Math.min(
            1,
            Math.max(0.08, (smoothedSpeed - 0.3) / 16)
          );

          // Detect rapid direction reversals (left-right shake) or tight circular
          // loops with gentler increments so buildup feels gradual and earned.
          if (hasPrevDir) {
            const dot = Math.max(
              -1,
              Math.min(1, dirX * prevDirX + dirY * prevDirY)
            );
            const turnAngle = Math.acos(dot);
            accumTurnRad += turnAngle;

            if (dot < 0.3) {
              currentPassId++;
              accumTurnRad = 0;
              const shakeBoost = (1 - dot) * 0.085 * (0.4 + 0.6 * speedNorm);
              repeatLevel = Math.min(1, repeatLevel + shakeBoost);
            } else if (accumTurnRad >= 1.05) {
              currentPassId++;
              accumTurnRad = 0;
              const circleBoost = 0.105 * (0.4 + 0.6 * speedNorm);
              repeatLevel = Math.min(1, repeatLevel + circleBoost);
            }
          }
          prevDirX = dirX;
          prevDirY = dirY;
          hasPrevDir = true;

          const startT =
            lastDepositTime > 0 ? Math.max(now - 32, lastDepositTime) : now;
          const steps = Math.min(14, Math.max(1, Math.ceil(segDist / 5)));

          for (let i = 1; i <= steps; i++) {
            const frac = i / steps;
            const sx = lastDepositX + segDx * frac;
            const sy = lastDepositY + segDy * frac;
            const stampTime = startT + (now - startT) * frac;
            depositStamp(
              sx,
              sy,
              dirX,
              dirY,
              speedNorm,
              stampTime,
              currentPassId,
              steps
            );
          }

          lastDepositX = smoothX;
          lastDepositY = smoothY;
          lastDepositTime = now;
        }
      } else if (pointerInside && hasPointer) {
        lastDepositX = smoothX;
        lastDepositY = smoothY;
        lastDepositTime = now;
        hasPrevDir = false;
        accumTurnRad = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (activeMaxC < activeMinC || activeMaxR < activeMinR) {
        if (
          pointerInside &&
          Math.hypot(targetX - smoothX, targetY - smoothY) > 0.6
        ) {
          rafId = requestAnimationFrame(render);
        } else {
          lastFrameTime = 0;
        }
        return;
      }

      let nextMinC = cols;
      let nextMaxC = -1;
      let nextMinR = rows;
      let nextMaxR = -1;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.font =
        '500 9.5px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = glyphStyle;

      for (let r = activeMinR; r <= activeMaxR; r++) {
        const baseY = r * CELL_H + CELL_H * 0.5;
        const rowOffset = r * cols;

        for (let c = activeMinC; c <= activeMaxC; c++) {
          const idx = rowOffset + c;
          const peak = peakEnergy[idx];
          if (peak <= 0) continue;

          const cell = grid[idx];
          if (!cell) continue;

          const e = currentCellEnergy(peak, touchedAt[idx], cell.asyncRate, now);
          if (e < FLOOR_DASH) {
            peakEnergy[idx] = 0;
            lastPassId[idx] = 0;
            continue;
          }

          if (c < nextMinC) nextMinC = c;
          if (c > nextMaxC) nextMaxC = c;
          if (r < nextMinR) nextMinR = r;
          if (r > nextMaxR) nextMaxR = r;

          const baseX = c * CELL_W + CELL_W * 0.5;

          const ch = e >= THRESH_HIGH ? "o" : e >= THRESH_MID ? "<" : "-";
          ctx.fillText(ch, baseX, baseY);
        }
      }

      ctx.restore();

      activeMinC = nextMinC;
      activeMaxC = nextMaxC;
      activeMinR = nextMinR;
      activeMaxR = nextMaxR;

      const hasLiveCells = activeMaxC >= activeMinC && activeMaxR >= activeMinR;
      const pointerStillCatchingUp =
        pointerInside && Math.hypot(targetX - smoothX, targetY - smoothY) > 0.6;

      if (hasLiveCells || pointerStillCatchingUp) {
        rafId = requestAnimationFrame(render);
      } else {
        lastFrameTime = 0;
      }
    };

    const schedule = () => {
      if (!rafId && isVisible && !reducedMotion.matches) {
        rafId = requestAnimationFrame(render);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion.matches || e.pointerType === "touch") return;
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      pointerInside = inside;

      if (inside) {
        targetX = x;
        targetY = y;
        if (!hasPointer) {
          hasPointer = true;
          smoothX = x;
          smoothY = y;
          lastDepositX = x;
          lastDepositY = y;
          lastDepositTime = performance.now();
        }
        schedule();
      }
    };

    const onPointerLeaveWindow = () => {
      pointerInside = false;
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisible = entry.isIntersecting;
        if (isVisible && activeMaxC >= activeMinC) {
          schedule();
        }
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    const mo = new MutationObserver(syncPalette);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeaveWindow, { passive: true });
    window.addEventListener("blur", onPointerLeaveWindow, { passive: true });

    return () => {
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeaveWindow);
      window.removeEventListener("blur", onPointerLeaveWindow);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={wrapRef} className="tc-hero-field" aria-hidden="true">
      <div className="tc-hero-ambient" />
      <canvas ref={canvasRef} className="tc-hero-canvas" />
    </div>
  );
}

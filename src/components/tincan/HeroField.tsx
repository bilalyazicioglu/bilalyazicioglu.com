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
 * - Single swipe: compact ~22–31px base radius with organic variance and
 *   physics-driven wake dispersion.
 * - Repetitive fast back-and-forth / circular motion: expands concentrically
 *   outward up to a strict cap of MAX_EXPANDED_RADIUS (76px), with more "o"
 *   in the center and expanding "<" and "-" rings around it.
 */
const MIN_SWIPE_RADIUS = 22;
const MAX_SWIPE_RADIUS = 31;
const MAX_EXPANDED_RADIUS = 76;

/**
 * Energy thresholds for the 3-character ramp:
 *   "-" (low density)  : [FLOOR_DASH .. THRESH_MID)   -> outer layer & dispersed wake
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

/** Maximum live kinetic wake particles in the pre-allocated physics pool. */
const MAX_PARTICLES = 900;

type Cell = {
  /** Static spatial energy jitter so rows never step in a straight line. */
  jitter: number;
  /** Threshold offset for glyph transitions ("o" <-> "<" <-> "-"). */
  stageBias: number;
  /** Outer-edge dropout bias so border "-" rows have natural gaps. */
  edgeGate: number;
  /**
   * Asynchronous decay rate multiplier (0.58 .. 1.52) so neighbouring cells
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

/** Fast 1D integer hash in [0, 1) for particle seeding. */
function hash1d(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
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

/** Partial derivative step for divergence-free 2D curl noise. */
const CURL_EPS = 0.18;
const INV_2CURL_EPS = 1 / (2 * CURL_EPS);

function buildGrid(cols: number, rows: number): Cell[] {
  const cells: Cell[] = new Array(cols * rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;

      const fineJit = hash2d(c, r, 3) - 0.5;
      const patchJit = valueNoise2D(c * 0.42, r * 0.42, 13) - 0.5;
      const jitter = fineJit * 0.15 + patchJit * 0.09;

      const stageBias = (hash2d(c, r, 31) - 0.5) * 0.08;
      const edgeGate = hash2d(c, r, 47);

      const cellRand = hash2d(c, r, 6);
      const patchRand = valueNoise2D(c * 0.32, r * 0.32, 19);
      const asyncRate = 0.58 + (cellRand * 0.65 + patchRand * 0.35) * 0.94;

      cells[idx] = {
        jitter,
        stageBias,
        edgeGate,
        asyncRate,
      };
    }
  }

  return cells;
}

/**
 * Physics-driven monochrome ASCII wake field:
 * - Cursor motion injects kinetic wake puffs and scattered flank particles
 *   that carry forward momentum, lateral bow-wave velocity, and curl-noise
 *   vorticity before decelerating under fluid drag.
 * - Breaks straight-line uniformity via vortex-street path undulation,
 *   stochastic edge scatter, and per-cell threshold jitter.
 * - Repetitive short shakes or tight circles build `repeatLevel` (up to a
 *   strict cap), forming "o" in the core while "<" and "-" rings swirl and
 *   disperse outward around it.
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

    // Grid-level smoothed state & per-frame accumulation buffers.
    let gridEnergy = new Float32Array(0);
    let gridVx = new Float32Array(0);
    let gridVy = new Float32Array(0);
    let frameEnergy = new Float32Array(0);
    let frameVx = new Float32Array(0);
    let frameVy = new Float32Array(0);
    let lastSeenAt = new Float64Array(0);
    let lastPassId = new Int32Array(0);

    // Pre-allocated SOA particle pool for zero-GC physics simulation.
    const pX = new Float32Array(MAX_PARTICLES);
    const pY = new Float32Array(MAX_PARTICLES);
    const pVx = new Float32Array(MAX_PARTICLES);
    const pVy = new Float32Array(MAX_PARTICLES);
    const pPeak = new Float32Array(MAX_PARTICLES);
    const pRad = new Float32Array(MAX_PARTICLES);
    const pBorn = new Float64Array(MAX_PARTICLES);
    const pLife = new Float32Array(MAX_PARTICLES);
    const pDrag = new Float32Array(MAX_PARTICLES);
    const pTurb = new Float32Array(MAX_PARTICLES);
    const pExpand = new Float32Array(MAX_PARTICLES);
    const pSeed = new Float32Array(MAX_PARTICLES);
    let particleCount = 0;
    let spawnSeq = 1;

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
    let travelDist = 0;

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
      const isLight =
        document.documentElement.getAttribute("data-theme") === "light";
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
      const total = cols * rows;
      grid = buildGrid(cols, rows);
      gridEnergy = new Float32Array(total);
      gridVx = new Float32Array(total);
      gridVy = new Float32Array(total);
      frameEnergy = new Float32Array(total);
      frameVx = new Float32Array(total);
      frameVy = new Float32Array(total);
      lastSeenAt = new Float64Array(total);
      lastPassId = new Int32Array(total);
      particleCount = 0;
      activeMinC = cols;
      activeMaxC = -1;
      activeMinR = rows;
      activeMaxR = -1;
      syncPalette();
    };

    const spawnParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      peak: number,
      rad: number,
      bornAt: number,
      lifeMs: number,
      drag: number,
      turb: number,
      expand: number,
      seed: number
    ) => {
      let idx = particleCount;
      if (idx < MAX_PARTICLES) {
        particleCount++;
      } else {
        idx = spawnSeq % MAX_PARTICLES;
      }

      pX[idx] = x;
      pY[idx] = y;
      pVx[idx] = vx;
      pVy[idx] = vy;
      pPeak[idx] = peak;
      pRad[idx] = rad;
      pBorn[idx] = bornAt;
      pLife[idx] = lifeMs;
      pDrag[idx] = drag;
      pTurb[idx] = turb;
      pExpand[idx] = expand;
      pSeed[idx] = seed;
    };

    const depositStamp = (
      cx: number,
      cy: number,
      dirX: number,
      dirY: number,
      speedPxPerSec: number,
      speedNorm: number,
      stampTime: number,
      passId: number,
      stepCount: number,
      stepDist: number
    ) => {
      travelDist += stepDist;
      const perpX = -dirY;
      const perpY = dirX;

      // Probe the grid around cursor center to see if we're crossing an active wake.
      const centerCol = Math.max(
        0,
        Math.min(cols - 1, Math.floor(cx / CELL_W))
      );
      const centerRow = Math.max(
        0,
        Math.min(rows - 1, Math.floor(cy / CELL_H))
      );
      const centerIdx = centerRow * cols + centerCol;
      const centerExisting = gridEnergy[centerIdx];
      const centerGap = stampTime - lastSeenAt[centerIdx];
      const centerNewPass =
        lastPassId[centerIdx] !== 0 && lastPassId[centerIdx] !== passId;

      if (centerExisting >= 0.22 && (centerNewPass || centerGap >= 90)) {
        const boost =
          ((0.055 + 0.085 * speedNorm) / stepCount) *
          (centerNewPass ? 1 : 0.7);
        repeatLevel = Math.min(1, repeatLevel + boost);
      }

      // Stamp a small neighborhood in lastSeenAt/lastPassId so subsequent passes detect overlap reliably.
      for (let dr = -1; dr <= 1; dr++) {
        const rr = centerRow + dr;
        if (rr < 0 || rr >= rows) continue;
        for (let dc = -1; dc <= 1; dc++) {
          const cc = centerCol + dc;
          if (cc < 0 || cc >= cols) continue;
          const nIdx = rr * cols + cc;
          lastSeenAt[nIdx] = stampTime;
          lastPassId[nIdx] = passId;
        }
      }

      // Delayed onset + ease-in for repetition buildup ("o" core & expanded rings).
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

      const baseSwipeR =
        MIN_SWIPE_RADIUS + speedNorm * (MAX_SWIPE_RADIUS - MIN_SWIPE_RADIUS);
      const radius =
        baseSwipeR + expandRep * (MAX_EXPANDED_RADIUS - baseSwipeR);

      const centerPeak =
        oRep > 0
          ? THRESH_HIGH + 0.03 + oRep * (MAX_ENERGY - THRESH_HIGH - 0.03)
          : SINGLE_PASS_CAP;

      // Vortex-street undulation + noise wobble breaks ruler-straight mouse lines.
      const s1 = hash1d(spawnSeq++);
      const s2 = hash1d(spawnSeq++);
      const s3 = hash1d(spawnSeq++);
      const vortexWave =
        Math.sin(travelDist * 0.058) * 0.55 +
        (valueNoise2D(cx * 0.028, cy * 0.028, 9) - 0.5) * 1.15;
      const spineWobble =
        (vortexWave * 5.2 + (s1 - 0.5) * 4.4) * (1 + expandRep * 0.35);

      const coreX = cx + perpX * spineWobble + dirX * (s2 - 0.5) * 3.5;
      const coreY = cy + perpY * spineWobble + dirY * (s2 - 0.5) * 3.5;

      // 1. Primary Core Wake Puff: carries forward momentum + lateral vortex shear
      // and swells slightly as fluid drag slows it down.
      const radVar = 0.84 + s3 * 0.32;
      const coreRad = radius * radVar;
      const forwardCarry =
        Math.min(68, speedPxPerSec * 0.14) + (10 + 18 * speedNorm);
      const vortexSign = Math.sin(travelDist * 0.075 + (s1 - 0.5) * 1.6);
      const lateralShear =
        vortexSign * (14 + 24 * speedNorm + expandRep * 22) +
        (s2 - 0.5) * 18;

      const coreVx = dirX * forwardCarry + perpX * lateralShear;
      const coreVy = dirY * forwardCarry + perpY * lateralShear;
      const coreLife = 920 + s1 * 420 + expandRep * 180;

      spawnParticle(
        coreX,
        coreY,
        coreVx,
        coreVy,
        centerPeak * (0.94 + s2 * 0.08),
        coreRad,
        stampTime,
        coreLife,
        2.9 + s3 * 1.1,
        36 + 32 * speedNorm + expandRep * 28,
        0.24 + expandRep * 0.12,
        s1 * 100
      );

      // 2. Secondary Counter-Swirl Puff (spawned on ~65% of steps) so the trail
      // cross-section is asymmetric, varied in thickness, and splits into wakes.
      if (s2 > 0.34) {
        const s4 = hash1d(spawnSeq++);
        const s5 = hash1d(spawnSeq++);
        const side = s4 > 0.5 ? 1 : -1;
        const offsetPerp = side * radius * (0.22 + s5 * 0.28);
        const puffVx =
          dirX * (forwardCarry * (0.55 + s4 * 0.5)) +
          perpX * (side * (22 + 34 * speedNorm + expandRep * 28));
        const puffVy =
          dirY * (forwardCarry * (0.55 + s4 * 0.5)) +
          perpY * (side * (22 + 34 * speedNorm + expandRep * 28));

        spawnParticle(
          cx + perpX * offsetPerp,
          cy + perpY * offsetPerp,
          puffVx,
          puffVy,
          Math.min(
            centerPeak * 0.88,
            THRESH_MID + 0.14 + oRep * 0.28 + s4 * 0.08
          ),
          radius * (0.52 + s5 * 0.26),
          stampTime,
          760 + s4 * 460,
          3.1 + s5 * 1.2,
          48 + 38 * speedNorm,
          0.28,
          s4 * 100
        );
      }

      // 3. Detached Kinetic Scatter Particles: small droplets/wisps ejected
      // outward from the wake that coast 1–3 cells away under drag & curl turbulence.
      const scatterCount =
        (s3 > 0.38 ? 1 : 0) +
        (speedNorm > 0.28 && s1 > 0.42 ? 1 : 0) +
        (expandRep > 0.15 ? 1 : 0);

      for (let k = 0; k < scatterCount; k++) {
        const rA = hash1d(spawnSeq++);
        const rB = hash1d(spawnSeq++);
        const rC = hash1d(spawnSeq++);

        // Eject mostly laterally outward + slightly forward or trailing in the wake.
        const side = rA > 0.5 ? 1 : -1;
        const spreadAngle =
          side * (0.65 + rB * 0.85) + (rC - 0.5) * 0.45;
        const cosA = Math.cos(spreadAngle);
        const sinA = Math.sin(spreadAngle);
        const ejectDirX = dirX * cosA - dirY * sinA;
        const ejectDirY = dirX * sinA + dirY * cosA;

        const spawnDist = radius * (0.32 + rB * 0.48);
        const sx =
          cx +
          perpX * side * spawnDist +
          dirX * (rC - 0.5) * radius * 0.45;
        const sy =
          cy +
          perpY * side * spawnDist +
          dirY * (rC - 0.5) * radius * 0.45;

        const ejectSpeed =
          (38 + rA * 58) * (0.65 + 0.55 * speedNorm) * (1 + expandRep * 0.45);
        const svx = ejectDirX * ejectSpeed;
        const svy = ejectDirY * ejectSpeed;

        // Scatter particles carry mostly "-" energy, occasionally starting at "<"
        // near the core before cooling to "-" as they coast outward.
        const scatterPeak =
          FLOOR_DASH + 0.12 + rB * 0.22 + oRep * 0.16;
        const scatterRad = 11.5 + rC * 6.5 + expandRep * 4;

        spawnParticle(
          sx,
          sy,
          svx,
          svy,
          scatterPeak,
          scatterRad,
          stampTime,
          640 + rA * 540,
          2.6 + rB * 1.4,
          68 + rC * 45,
          0.12,
          rA * 100
        );
      }
    };

    const render = (now: number) => {
      rafId = 0;
      if (!isVisible || reducedMotion.matches) {
        gridEnergy.fill(0);
        gridVx.fill(0);
        gridVy.fill(0);
        particleCount = 0;
        repeatLevel = 0;
        smoothedRepeat = 0;
        activeMinC = cols;
        activeMaxC = -1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const dt = lastFrameTime
        ? Math.min(0.05, (now - lastFrameTime) / 1000)
        : 1 / 60;
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
      const instSpeed =
        Math.hypot(frameDx, frameDy) / Math.max(0.5, frameScale);
      smoothedSpeed +=
        (instSpeed - smoothedSpeed) * Math.min(1, 0.35 * frameScale);

      if (pointerInside && hasPointer && smoothedSpeed > 0.3) {
        const segDx = smoothX - lastDepositX;
        const segDy = smoothY - lastDepositY;
        const segDist = Math.hypot(segDx, segDy);

        if (segDist >= 3.0) {
          const dirX = segDx / segDist;
          const dirY = segDy / segDist;
          const speedNorm = Math.min(
            1,
            Math.max(0.08, (smoothedSpeed - 0.3) / 16)
          );
          const speedPxPerSec = smoothedSpeed * 60;

          // Detect rapid direction reversals (left-right shake) or tight circular loops.
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
          const steps = Math.min(10, Math.max(1, Math.ceil(segDist / 6.5)));
          const stepDist = segDist / steps;

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
              speedPxPerSec,
              speedNorm,
              stampTime,
              currentPassId,
              steps,
              stepDist
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

      // Clear per-frame splat buffers inside the previous active bounding box.
      if (activeMaxC >= activeMinC && activeMaxR >= activeMinR) {
        for (let r = activeMinR; r <= activeMaxR; r++) {
          const rowOff = r * cols;
          for (let c = activeMinC; c <= activeMaxC; c++) {
            const idx = rowOff + c;
            frameEnergy[idx] = 0;
            frameVx[idx] = 0;
            frameVy[idx] = 0;
          }
        }
      }

      const timeSec = now * 0.001;
      const driftX = timeSec * 0.32;
      const driftY = -timeSec * 0.26;

      // Step physics for all live wake particles & splat onto the ASCII grid.
      let i = 0;
      while (i < particleCount) {
        const age = now - pBorn[i];
        const life = pLife[i];
        if (age >= life) {
          // Swap-remove expired particle in O(1).
          const last = --particleCount;
          if (i < last) {
            pX[i] = pX[last];
            pY[i] = pY[last];
            pVx[i] = pVx[last];
            pVy[i] = pVy[last];
            pPeak[i] = pPeak[last];
            pRad[i] = pRad[last];
            pBorn[i] = pBorn[last];
            pLife[i] = pLife[last];
            pDrag[i] = pDrag[last];
            pTurb[i] = pTurb[last];
            pExpand[i] = pExpand[last];
            pSeed[i] = pSeed[last];
          }
          continue;
        }

        const u = Math.max(0, age / life);
        const seed = pSeed[i];

        // 2D curl-noise turbulence acceleration + exponential fluid drag.
        const cxSample = pX[i] * 0.018 + driftX + seed;
        const cySample = pY[i] * 0.018 + driftY - seed;
        const curlX =
          (valueNoise2D(cxSample, cySample + CURL_EPS, 29) -
            valueNoise2D(cxSample, cySample - CURL_EPS, 29)) *
          INV_2CURL_EPS;
        const curlY =
          -(
            valueNoise2D(cxSample + CURL_EPS, cySample, 29) -
            valueNoise2D(cxSample - CURL_EPS, cySample, 29)
          ) * INV_2CURL_EPS;
        const turb = pTurb[i] * (1 - u * 0.45);
        const damp = Math.exp(-pDrag[i] * dt);

        const vx = (pVx[i] + curlX * turb * dt) * damp;
        const vy = (pVy[i] + curlY * turb * dt) * damp;
        const nx = pX[i] + vx * dt;
        const ny = pY[i] + vy * dt;

        pVx[i] = vx;
        pVy[i] = vy;
        pX[i] = nx;
        pY[i] = ny;

        // Energy envelope & progressive wake expansion.
        const stageFactor = 1 - u * (0.58 + 0.42 * u);
        const curPeak = pPeak[i] * stageFactor;
        if (curPeak < FLOOR_DASH * 0.85) {
          i++;
          continue;
        }

        const curRad =
          pRad[i] * (1 + pExpand[i] * Math.sin(u * Math.PI * 0.85));
        const invRad = 1 / curRad;
        const warpAmp = Math.min(16, curRad * 0.36);
        const pad = curRad + warpAmp + 2;

        const c0 = Math.max(0, Math.floor((nx - pad) / CELL_W));
        const c1 = Math.min(cols - 1, Math.ceil((nx + pad) / CELL_W));
        const r0 = Math.max(0, Math.floor((ny - pad) / CELL_H));
        const r1 = Math.min(rows - 1, Math.ceil((ny + pad) / CELL_H));

        if (c0 < activeMinC) activeMinC = c0;
        if (c1 > activeMaxC) activeMaxC = c1;
        if (r0 < activeMinR) activeMinR = r0;
        if (r1 > activeMaxR) activeMaxR = r1;

        for (let r = r0; r <= r1; r++) {
          const baseY = r * CELL_H + CELL_H * 0.5;
          const rowOff = r * cols;

          for (let c = c0; c <= c1; c++) {
            const baseX = c * CELL_W + CELL_W * 0.5;
            const rawDx = baseX - nx;
            const rawDy = baseY - ny;
            if (rawDx * rawDx + rawDy * rawDy > pad * pad) continue;

            const idx = rowOff + c;
            const cell = grid[idx];
            if (!cell) continue;

            const wx =
              (valueNoise2D(
                baseX * 0.042 + driftX,
                baseY * 0.042 + driftY,
                11
              ) -
                0.5) *
              warpAmp;
            const wy =
              (valueNoise2D(
                baseX * 0.042 - driftY,
                baseY * 0.042 + driftX,
                23
              ) -
                0.5) *
              warpAmp;

            const dist = Math.hypot(rawDx + wx, rawDy + wy);
            const falloff = 1 - dist * invRad + cell.jitter;
            if (falloff <= 0.04) continue;

            const clampedF = Math.min(1, falloff);
            const contrib =
              FLOOR_DASH +
              Math.pow(clampedF, 1.18) * (curPeak - FLOOR_DASH);

            const prevE = frameEnergy[idx];
            if (contrib > prevE) {
              // Subtle constructive boost when multiple dispersed puffs overlap.
              frameEnergy[idx] = Math.min(
                MAX_ENERGY,
                contrib + prevE * 0.12
              );
              frameVx[idx] = vx;
              frameVy[idx] = vy;
            } else if (contrib > FLOOR_DASH) {
              frameEnergy[idx] = Math.min(
                MAX_ENERGY,
                prevE + contrib * 0.08
              );
            }
          }
        }

        i++;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (activeMaxC < activeMinC || activeMaxR < activeMinR) {
        if (
          particleCount > 0 ||
          (pointerInside &&
            Math.hypot(targetX - smoothX, targetY - smoothY) > 0.6)
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

      const velFollow = Math.min(1, dt * 10);
      const velDecay = Math.exp(-dt * 6.5);

      for (let r = activeMinR; r <= activeMaxR; r++) {
        const baseY = r * CELL_H + CELL_H * 0.5;
        const rowOffset = r * cols;

        for (let c = activeMinC; c <= activeMaxC; c++) {
          const idx = rowOffset + c;
          const cell = grid[idx];
          if (!cell) continue;

          const targetE = frameEnergy[idx];
          let e = gridEnergy[idx];

          if (targetE >= e) {
            e = targetE;
            gridVx[idx] += (frameVx[idx] - gridVx[idx]) * velFollow;
            gridVy[idx] += (frameVy[idx] - gridVy[idx]) * velFollow;
          } else {
            // Asynchronous per-cell relaxation prevents 1-frame flicker as particles cross cells
            // and staggers the final "o" -> "<" -> "-" -> empty transitions.
            const relax = Math.exp(-dt * 4.2 * cell.asyncRate);
            e = targetE + (e - targetE) * relax;
            gridVx[idx] *= velDecay;
            gridVy[idx] *= velDecay;
          }

          if (e < FLOOR_DASH) {
            gridEnergy[idx] = 0;
            gridVx[idx] = 0;
            gridVy[idx] = 0;
            lastPassId[idx] = 0;
            continue;
          }

          gridEnergy[idx] = e;

          if (c < nextMinC) nextMinC = c;
          if (c > nextMaxC) nextMaxC = c;
          if (r < nextMinR) nextMinR = r;
          if (r > nextMaxR) nextMaxR = r;

          // Stochastic outer-edge thinning breaks solid straight "-" lines into aerated clusters.
          if (e < FLOOR_DASH + 0.065 && cell.edgeGate < 0.28) {
            continue;
          }

          const baseX = c * CELL_W + CELL_W * 0.5;
          const ox = Math.max(-2.0, Math.min(2.0, gridVx[idx] * 0.028));
          const oy = Math.max(-2.0, Math.min(2.0, gridVy[idx] * 0.028));

          const stagedE = e + cell.stageBias;
          const ch =
            stagedE >= THRESH_HIGH
              ? "o"
              : stagedE >= THRESH_MID
                ? "<"
                : "-";
          ctx.fillText(ch, baseX + ox, baseY + oy);
        }
      }

      ctx.restore();

      activeMinC = nextMinC;
      activeMaxC = nextMaxC;
      activeMinR = nextMinR;
      activeMaxR = nextMaxR;

      const hasLiveCells =
        particleCount > 0 ||
        (activeMaxC >= activeMinC && activeMaxR >= activeMinR);
      const pointerStillCatchingUp =
        pointerInside &&
        Math.hypot(targetX - smoothX, targetY - smoothY) > 0.6;

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
        if (isVisible && (particleCount > 0 || activeMaxC >= activeMinC)) {
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
    document.addEventListener("pointerleave", onPointerLeaveWindow, {
      passive: true,
    });
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

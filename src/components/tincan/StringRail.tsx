"use client";

import { useEffect, useRef, useState } from "react";

/** Must match the slack path in the page: M50 0 Q0 50 50 100, in a 100-wide box. */
const SAG_CONTROL_X = 0;

/**
 * Horizontal offset of the bow at progress `t` through the leg, as a fraction
 * of the gutter. For a quadratic with its control point at y=50, y is linear
 * in t, so scroll progress through the leg is t itself.
 */
function sagAt(t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  return (2 * clamped * (1 - clamped) * (SAG_CONTROL_X - 50)) / 100;
}

/**
 * The string down the page. Each leg below it draws its own stretch of line
 * (taut, slack or frayed — see tincan.css); this adds the one thing that
 * travels: a pulse held at the middle of the screen, so scrolling is what moves
 * your voice down the string, and it takes on the state of whichever leg it is
 * passing through.
 */
export function StringRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);
  const [strand, setStrand] = useState("none");

  // Which leg is under the middle of the screen decides the pulse's state, and
  // where the string sags the pulse follows the bow instead of cutting across it.
  useEffect(() => {
    const root = ref.current;
    const pulse = pulseRef.current;
    if (!root || !pulse) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      let sag = 0;
      let here = "none";
      for (const leg of root.querySelectorAll<HTMLElement>(".tc-leg[data-strand]")) {
        const box = leg.getBoundingClientRect();
        if (box.top > middle || box.bottom < middle) continue;
        here = leg.dataset.strand ?? "none";
        if (here === "slack") {
          const gutter = pulse.parentElement?.clientWidth ?? 0;
          sag = sagAt((middle - box.top) / box.height) * gutter;
        }
      }
      setStrand(here);
      pulse.style.setProperty("--tc-sag", `${sag.toFixed(1)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="tc-strung">
      <div className="tc-rail" aria-hidden="true">
        <span ref={pulseRef} className="tc-pulse" data-strand={strand} />
      </div>
      {children}
    </div>
  );
}

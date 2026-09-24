"use client";

import { useEffect, useRef } from "react";

/**
 * The recording, played the way a GIF would be — silent, looping, no controls —
 * at a quarter of the GIF's weight. It only plays while it is on screen, and
 * holds on its poster frame for visitors who asked for less motion.
 */
export function DemoLoop() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const decide = () => {
      if (visible && !still.matches && !document.hidden) {
        // A browser may refuse autoplay (data saver, low power); the poster stays.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      decide();
    });
    observer.observe(video);
    still.addEventListener("change", decide);
    document.addEventListener("visibilitychange", decide);
    return () => {
      observer.disconnect();
      still.removeEventListener("change", decide);
      document.removeEventListener("visibilitychange", decide);
    };
  }, []);

  return (
    <video
      ref={ref}
      className="tc-video"
      src="/uploads/blog/tincan-demo.mp4"
      poster="/tincan/demo-poster.jpg"
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      aria-label="Screen recording of tincan: audio meters, the pulse travelling down the string, chat, and the audio settings screen."
    />
  );
}

"use client";

import { useEffect, useState } from "react";

export function ViewCounter({
  slug,
  initialViews,
  trackView = true,
}: {
  slug: string;
  initialViews?: number;
  trackView?: boolean;
}) {
  const [views, setViews] = useState<number | null>(initialViews ?? null);

  useEffect(() => {
    const method = trackView ? "POST" : "GET";
    fetch(`/api/views/${slug}`, {
      method,
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.count === "number") {
          setViews(data.count);
        }
      })
      .catch((err) => {
        console.error("ViewCounter fetch error:", err);
      });
  }, [slug, trackView]);

  const count = views ?? initialViews ?? 0;
  const label = count === 1 ? "1 view" : `${count} views`;

  return (
    <span className="tabular-nums">
      {label}
    </span>
  );
}

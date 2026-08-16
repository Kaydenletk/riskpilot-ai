"use client";

// Scroll-entrance visibility. Compositor-only styling is the CALLER's job —
// this hook only reports visibility. No IO (old browser / jsdom) → visible
// immediately: content must never be trapped hidden.
import { useEffect, useRef, useState } from "react";

export function useReveal<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  return { ref, visible };
}

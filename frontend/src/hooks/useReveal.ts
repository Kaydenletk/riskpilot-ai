"use client";

// Scroll-entrance visibility. Compositor-only styling is the CALLER's job —
// this hook only reports visibility.
//
// `visible` starts false UNCONDITIONALLY so the client's first render always
// matches Next's server render (Node has no IntersectionObserver). Computing
// the initial value from `typeof IntersectionObserver` inside the useState
// initializer would make SSR emit "revealed" HTML while the client's first
// render (which also sees no IO in that branch — but only there) computes a
// different value depending on environment, producing a hydration mismatch
// and a visible flip from shown to hidden. The no-IO fallback is instead
// resolved inside the mount effect — same pattern as LiveContextPanel.tsx —
// which only ever runs on the client, after hydration.
import { useEffect, useRef, useState } from "react";

export function useReveal<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;

    // No IO (old browser / jsdom) → visible immediately: content must never
    // be trapped hidden. Checked before the ref guard below because this
    // fallback must not depend on the ref ever being attached to a node.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    if (!ref.current) return;
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

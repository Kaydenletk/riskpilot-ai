"use client";

import { useReveal } from "@/hooks/useReveal";

import styles from "./reveal.module.css";

// Wrapper for scroll-entrance. transform/opacity only; the global
// prefers-reduced-motion kill-switch zeroes the transition.
export function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.in : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

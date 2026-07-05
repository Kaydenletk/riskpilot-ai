"use client";

import { useEffect, useState } from "react";

import styles from "./theme-toggle.module.css";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // The pre-paint script already set data-theme (stored value, else OS preference,
    // else light). Mirror whatever it chose so the button label matches the page.
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") setTheme(attr);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("rp-theme", next); } catch {}
  }

  return (
    <button
      className={styles.btn}
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? "☀︎ Light" : "☾ Dark"}
    </button>
  );
}

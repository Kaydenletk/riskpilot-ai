import { renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { useReveal } from "./useReveal";

test("falls back to visible when IntersectionObserver is missing", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  const { result } = renderHook(() => useReveal<HTMLDivElement>());
  expect(result.current.visible).toBe(true);
});

test("starts hidden when IntersectionObserver exists", () => {
  const observe = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn().mockImplementation(() => ({ observe, disconnect: vi.fn() })),
  );
  const { result } = renderHook(() => useReveal<HTMLDivElement>());
  expect(result.current.visible).toBe(false);
});

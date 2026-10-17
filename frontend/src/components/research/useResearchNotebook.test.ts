import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import {
  emptyNotebook,
  NOTEBOOK_KEY,
  parseNotebooks,
} from "@/lib/research/notebook";
import { useResearchNotebook } from "./useResearchNotebook";

afterEach(() => vi.unstubAllGlobals());

test("a quota-failed draft cannot erase another tab's later notebook when persistence resumes", () => {
  const data = new Map<string, string>();
  let failWrites = false;
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) throw new DOMException("Full", "QuotaExceededError");
      data.set(key, value);
    },
    removeItem: (key: string) => data.delete(key),
  };
  vi.stubGlobal("localStorage", storage);
  const { result } = renderHook(() => useResearchNotebook());
  failWrites = true;
  act(() =>
    result.current.update("NVDA", (notebook) => ({
      ...notebook,
      business: "Unsaved NVIDIA draft",
    })),
  );
  expect(result.current.storageAvailable).toBe(false);
  failWrites = false;
  storage.setItem(
    NOTEBOOK_KEY,
    JSON.stringify({
      version: 1,
      notebooks: {
        MSFT: { ...emptyNotebook(), business: "Saved in another tab" },
      },
    }),
  );
  act(() => result.current.remove("NVDA"));
  expect(parseNotebooks(storage.getItem(NOTEBOOK_KEY)).MSFT.business).toBe(
    "Saved in another tab",
  );
  expect(result.current.storageAvailable).toBe(true);
});

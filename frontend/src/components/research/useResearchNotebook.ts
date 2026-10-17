"use client";

import { useEffect, useRef, useState } from "react";

import {
  emptyNotebook,
  inspectNotebooks,
  NOTEBOOK_KEY,
  type Notebook,
  type Notebooks,
} from "@/lib/research/notebook";

// Read the latest collection immediately before each user mutation. A stale
// tab cannot replace another company's notebook. Same-field edits are last-write
// wins; this is browser memory, not a collaborative editor or cloud backup.
export function useResearchNotebook() {
  const [notebooks, setNotebooks] = useState<Notebooks>({});
  const [loaded, setLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [recoveryRaw, setRecoveryRaw] = useState<string | null>(null);
  const current = useRef<Notebooks>({});
  const dirtySymbols = useRef(new Set<string>());
  const recovery = useRef<string | null>(null);

  function reconcile(remote: Notebooks): Notebooks {
    const merged = { ...remote };
    for (const symbol of dirtySymbols.current) {
      const draft = current.current[symbol];
      if (!draft) {
        delete merged[symbol];
        continue;
      }
      const snapshots = new Map(
        (remote[symbol]?.snapshots ?? []).map((item) => [item.id, item]),
      );
      for (const snapshot of draft.snapshots)
        snapshots.set(snapshot.id, snapshot);
      merged[symbol] = {
        ...draft,
        snapshots: [...snapshots.values()].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      };
    }
    return merged;
  }

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(NOTEBOOK_KEY);
        const parsed = inspectNotebooks(raw);
        if (!parsed.ok) {
          recovery.current = raw;
          setRecoveryRaw(raw);
          setStorageAvailable(false);
          return;
        }
        // Overlay only locally dirty companies, while accepting other tabs'
        // newer notebooks and preserving their snapshot history.
        current.current = reconcile(parsed.notebooks);
        setNotebooks(current.current);
        recovery.current = null;
        setRecoveryRaw(null);
      } catch {
        setStorageAvailable(false);
      }
    }
    read();
    setLoaded(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === NOTEBOOK_KEY || event.key === null) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function commit(symbol: string, mutate: (latest: Notebooks) => Notebooks) {
    let latest = current.current;
    let blocked = recovery.current !== null;
    try {
      const raw = localStorage.getItem(NOTEBOOK_KEY);
      const parsed = inspectNotebooks(raw);
      if (!parsed.ok) {
        blocked = true;
        recovery.current = raw;
        setRecoveryRaw(raw);
      } else latest = reconcile(parsed.notebooks);
    } catch {
      /* Keep the in-memory draft if storage is disabled. */
    }
    const next = mutate(latest);
    dirtySymbols.current.add(symbol);
    current.current = next;
    setNotebooks(next);
    try {
      if (blocked) throw new Error("recovery_required");
      localStorage.setItem(
        NOTEBOOK_KEY,
        JSON.stringify({ version: 1, notebooks: next }),
      );
      dirtySymbols.current.clear();
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }

  function update(symbol: string, mutate: (notebook: Notebook) => Notebook) {
    commit(symbol, (latest) => ({
      ...latest,
      [symbol]: mutate(latest[symbol] ?? emptyNotebook()),
    }));
  }

  function remove(symbol: string) {
    commit(symbol, (latest) => {
      const next = { ...latest };
      delete next[symbol];
      return next;
    });
  }

  function resetUnreadableStorage() {
    try {
      localStorage.removeItem(NOTEBOOK_KEY);
      recovery.current = null;
      setRecoveryRaw(null);
      localStorage.setItem(
        NOTEBOOK_KEY,
        JSON.stringify({ version: 1, notebooks: current.current }),
      );
      dirtySymbols.current.clear();
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }

  return {
    notebooks,
    loaded,
    storageAvailable,
    recoveryRaw,
    update,
    remove,
    resetUnreadableStorage,
  };
}

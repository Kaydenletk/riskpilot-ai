// Pure helpers for the multi-ticker compare set. URL is the source of truth;
// these keep the set deduped, uppercased, and capped.
export const MAX_COMPARE = 4;

export function toggleCompare(set: string[], ticker: string): string[] {
  const t = ticker.trim().toUpperCase();
  if (!t) return set;
  if (set.includes(t)) return set.filter((x) => x !== t);
  if (set.length >= MAX_COMPARE) return set;
  return [...set, t];
}

export function serializeCompare(set: string[]): string {
  return set.join(",");
}

export function parseCompare(param: string | null): string[] {
  if (!param) return [];
  const out: string[] = [];
  for (const raw of param.split(",")) {
    const t = raw.trim().toUpperCase();
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_COMPARE) break;
  }
  return out;
}

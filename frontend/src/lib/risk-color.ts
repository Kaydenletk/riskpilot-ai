// Maps a 0-100 risk score onto the semantic risk ramp (cool -> amber -> warm).
// Returns CSS custom-property references so the palette stays centralized.

export type RiskBand = "conservative" | "moderate" | "aggressive";

export function riskVar(band: RiskBand): string {
  if (band === "aggressive") return "var(--risk-high)";
  if (band === "moderate") return "var(--risk-mid)";
  return "var(--risk-low)";
}

// Text-safe ink variant: slightly adjusted hue/lightness for legibility on
// both light and dark surfaces (CSS variables handle the per-theme values).
export function riskInkVar(band: RiskBand): string {
  if (band === "aggressive") return "var(--risk-high-ink)";
  if (band === "moderate") return "var(--risk-mid-ink)";
  return "var(--risk-low-ink)";
}

// Continuous color for the gauge stroke: interpolate across the ramp by score.
// oklch interpolation via CSS color-mix keeps it perceptually smooth.
export function riskColorForScore(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s <= 50) {
    // low -> mid across 0..50
    const t = Math.round((s / 50) * 100);
    return `color-mix(in oklch, var(--risk-mid) ${t}%, var(--risk-low))`;
  }
  // mid -> high across 50..100
  const t = Math.round(((s - 50) / 50) * 100);
  return `color-mix(in oklch, var(--risk-high) ${t}%, var(--risk-mid))`;
}

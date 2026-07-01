import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RiskPilot AI — Portfolio Risk Coach",
    short_name: "RiskPilot",
    description:
      "Deterministic risk math, explained by a guardrailed LLM that never invents numbers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [{ src: "/icon", sizes: "any", type: "image/png" }],
  };
}

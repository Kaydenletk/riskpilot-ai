import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RiskPilot — Your Investing Second Brain",
    short_name: "RiskPilot",
    description:
      "Source-linked stock research, personal understanding, and a journal of your reasoning.",
    start_url: "/",
    display: "standalone",
    background_color: "#162a23",
    theme_color: "#162a23",
    icons: [{ src: "/icon", sizes: "any", type: "image/png" }],
  };
}

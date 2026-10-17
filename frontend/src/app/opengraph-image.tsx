import { ImageResponse } from "next/og";

import { OG_INK } from "@/lib/og-brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RiskPilot — Your Investing Second Brain";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#162a23",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 40,
            fontWeight: 700,
            color: OG_INK,
          }}
        >
          RISK<span style={{ color: "#b8d3a0" }}>/</span>PILOT
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            marginTop: 24,
            lineHeight: 1.1,
          }}
        >
          Understand first. Decide with context.
        </div>
        <div style={{ fontSize: 32, color: "#a3a3a3", marginTop: 24 }}>
          Company research. Source evidence. Your perspective.
        </div>
      </div>
    ),
    size,
  );
}

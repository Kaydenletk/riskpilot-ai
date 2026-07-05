import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RiskPilot AI — Portfolio Risk Coach";

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
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, color: "#7c9cff", fontWeight: 700 }}>RiskPilot AI</div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
          Portfolio risk math you can verify.
        </div>
        <div style={{ fontSize: 32, color: "#a3a3a3", marginTop: 24 }}>
          AI explanations that cannot invent the numbers.
        </div>
      </div>
    ),
    size,
  );
}

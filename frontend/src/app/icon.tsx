import { ImageResponse } from "next/og";

import { OG_ACCENT, OG_BG, OG_INK } from "@/lib/og-brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: OG_BG,
          color: OG_INK,
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        R<span style={{ color: OG_ACCENT }}>/</span>
      </div>
    ),
    size,
  );
}

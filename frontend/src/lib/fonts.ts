import { Space_Grotesk } from "next/font/google";

// Display face for the verdict headline + the gauge's large number only.
// Variable, self-hosted by next/font (no runtime dependency, no layout shift).
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

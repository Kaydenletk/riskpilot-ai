import { ResearchWorkspace } from "@/components/research/ResearchWorkspace";

export const dynamic = "force-dynamic";

export default function Home() {
  const liveAiAvailable =
    process.env.RESEARCH_LIVE_AI === "1" &&
    Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  return <ResearchWorkspace liveAiAvailable={liveAiAvailable} />;
}

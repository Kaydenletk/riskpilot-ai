// Server component: the project explainer. States the thesis (the AI never does
// the math) and walks the pipeline in three glass panels, each with a small
// inline diagram of what that stage does to the data. Reveal (client) handles
// the scroll-entrance per panel; the panels themselves stay static markup.
import { Reveal } from "@/components/ui/Reveal";

import styles from "./how-it-works.module.css";

const REPO_URL = "https://github.com/Kaydenletk/riskpilot-ai";

interface Step {
  n: string;
  title: string;
  sentence: React.ReactNode;
  diagram: React.ReactNode;
  accent?: boolean;
}

// Three input facts collapse into one deterministic figure.
function EngineDiagram() {
  return (
    <svg className={styles.diagram} viewBox="0 0 120 56" aria-hidden focusable="false">
      <rect className={styles.diagramBox} x="4" y="4" width="16" height="10" rx="2" />
      <rect className={styles.diagramBox} x="4" y="23" width="16" height="10" rx="2" />
      <rect className={styles.diagramBox} x="4" y="42" width="16" height="10" rx="2" />
      <line className={styles.diagramArrow} x1="26" y1="28" x2="58" y2="28" />
      <polygon className={styles.diagramArrowHead} points="58,21 72,28 58,35" />
      <text className={`${styles.diagramNum} ${styles.diagramNumLg} num`} x="96" y="35" textAnchor="middle">
        74
      </text>
    </svg>
  );
}

// The same figure fans out into prose lines — the model narrates, never invents.
function ModelDiagram() {
  return (
    <svg className={styles.diagram} viewBox="0 0 120 56" aria-hidden focusable="false">
      <text className={`${styles.diagramNum} ${styles.diagramNumLg} num`} x="18" y="35" textAnchor="middle">
        74
      </text>
      <line className={styles.diagramArrow} x1="40" y1="28" x2="62" y2="28" />
      <polygon className={styles.diagramArrowHead} points="62,21 76,28 62,35" />
      <rect className={styles.diagramLine} x="82" y="8" width="34" height="6" rx="3" />
      <rect className={styles.diagramLine} x="82" y="24" width="26" height="6" rx="3" />
      <rect className={styles.diagramLine} x="82" y="40" width="18" height="6" rx="3" />
    </svg>
  );
}

// One invented number gets circled and struck out (ink-faint — a rejection
// marker, not a risk color); the surviving line gets an accent checkmark.
function GuardrailDiagram() {
  return (
    <svg className={styles.diagram} viewBox="0 0 120 56" aria-hidden focusable="false">
      <rect className={styles.diagramLine} x="4" y="9" width="48" height="6" rx="3" />
      <text className={`${styles.diagramNum} ${styles.diagramNumSm} num`} x="66" y="19" textAnchor="middle">
        12
      </text>
      <circle className={styles.diagramReject} cx="66" cy="14" r="11" />
      <line className={styles.diagramReject} x1="58" y1="6" x2="74" y2="22" />
      <rect className={styles.diagramLine} x="4" y="38" width="58" height="6" rx="3" />
      <polyline className={styles.diagramCheck} points="86,36 94,44 108,28" />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Python computes",
    sentence: (
      <>
        Every number on this page comes from a deterministic risk engine —
        concentration, volatility, drawdown.
      </>
    ),
    diagram: <EngineDiagram />,
  },
  {
    n: "02",
    title: "The model explains",
    sentence: (
      <>An LLM turns the computed facts into the plain-language read you see above.</>
    ),
    diagram: <ModelDiagram />,
  },
  {
    n: "03",
    title: "A guardrail verifies",
    sentence: (
      <>Before anything ships, every figure in the prose is checked against the engine&apos;s output.</>
    ),
    diagram: <GuardrailDiagram />,
    accent: true,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-it-works-h">
      <div className={styles.head}>
        <span className="caption">How it works</span>
        <h2 id="how-it-works-h" className={`${styles.title} grad-text`}>
          The AI never does the math.
        </h2>
        <p className={styles.lede}>
          RiskPilot splits the work: deterministic Python computes the risk
          numbers, a language model explains them, and a guardrail makes sure
          the model can&apos;t invent a figure.
        </p>
      </div>

      <ol className={styles.steps}>
        {STEPS.map((s, i) => (
          <li key={s.n} className={`glass ${styles.step}`}>
            <Reveal delay={i * 120}>
              <span
                className={`${styles.stepNum} ${s.accent ? styles.stepNumAccent : ""}`}
                aria-hidden
              >
                {s.n}
              </span>
              {s.diagram}
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepBody}>{s.sentence}</p>
            </Reveal>
          </li>
        ))}
      </ol>

      <p className={styles.foot}>
        On the committed fixture set the guardrail caught{" "}
        <strong className="num">2/2</strong> injected hallucinations — zero
        invented numbers reached the page.{" "}
        <a href={`${REPO_URL}/blob/main/backend/src/riskpilot/llm/number_guardrail.py`}>
          Read the guardrail source
        </a>{" "}
        · <a href={REPO_URL}>full repo on GitHub</a> · educational coaching
        only, never buy/sell advice.
      </p>
    </section>
  );
}

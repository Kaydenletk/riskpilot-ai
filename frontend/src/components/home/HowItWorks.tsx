// Server component: the project explainer. States the thesis (the AI never does
// the math) and walks the pipeline in three editorial steps. Static content —
// deliberately NOT staged/animated so it can never be hidden behind an entrance.
import styles from "./how-it-works.module.css";

const REPO_URL = "https://github.com/Kaydenletk/riskpilot-ai";

interface Step {
  n: string;
  title: string;
  body: React.ReactNode;
  accent?: boolean;
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Python computes",
    body: (
      <>
        Every number on this page comes from a deterministic risk engine —
        concentration, volatility, drawdown. The engine imports zero LLM code,
        and a test enforces that boundary.
      </>
    ),
  },
  {
    n: "02",
    title: "The model explains",
    body: (
      <>
        An LLM turns the computed facts into the plain-language read you see
        above. It writes prose only — it adds no numbers of its own.
      </>
    ),
  },
  {
    n: "03",
    title: "A guardrail verifies",
    body: (
      <>
        Before anything ships, every figure in the prose is checked against the
        engine&apos;s output. An invented number gets the whole explanation
        rejected — the app falls back to a deterministic summary, fail-closed.
      </>
    ),
    accent: true,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.section} aria-labelledby="how-it-works-h">
      <div className={styles.head}>
        <span className="caption">How it works</span>
        <h2 id="how-it-works-h" className={styles.title}>
          The AI never does the math.
        </h2>
        <p className={styles.lede}>
          RiskPilot splits the work: deterministic Python computes the risk
          numbers, a language model explains them, and a guardrail makes sure
          the model can&apos;t invent a figure.
        </p>
      </div>

      <ol className={styles.steps}>
        {STEPS.map((s) => (
          <li key={s.n} className={styles.step}>
            <span className={`${styles.stepNum} ${s.accent ? styles.stepNumAccent : ""}`} aria-hidden>
              {s.n}
            </span>
            <h3 className={styles.stepTitle}>{s.title}</h3>
            <p className={styles.stepBody}>{s.body}</p>
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

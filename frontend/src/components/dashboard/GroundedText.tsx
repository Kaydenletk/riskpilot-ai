// Renders LLM prose with every number wrapped as a "verified" chip — making the
// guardrail's guarantee VISIBLE: each figure the AI wrote is tied back to the
// computed facts. This is the differentiator the design review flagged (F3.4):
// turn an invisible backend guarantee into a design feature a recruiter notices.
import { Fragment } from "react";

import styles from "./grounded-text.module.css";

// Split keeps the captured groups; a NON-global tester avoids the stateful
// lastIndex bug that a /g regex would hit on repeated .test() calls.
const NUMBER_SPLIT = /(\$?-?\d{1,3}(?:,\d{3})*(?:\.\d+)?%?|\$?-?\d+(?:\.\d+)?%?)/g;
const IS_NUMBER = /^\$?-?\d[\d,]*(?:\.\d+)?%?$/;

export function GroundedText({ text }: { text: string }) {
  const parts = text.split(NUMBER_SPLIT);
  return (
    <span>
      {parts.map((part, i) =>
        IS_NUMBER.test(part) ? (
          <span key={i} className={`num ${styles.chip}`} title="Verified against computed data">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

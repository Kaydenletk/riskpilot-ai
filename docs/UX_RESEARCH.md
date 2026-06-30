# RiskPilot AI — UX Research & Redesign

Method: ux-researcher-designer. Personas → journey maps → usability synthesis →
design implications. Research input: the two real audiences this product serves
(grounded in the autoplan CEO/design/DX reviews; no live interviews, so confidence
is noted per persona).

---

## The core tension

RiskPilot serves **two users with opposite jobs-to-be-done**, and the current
design quietly optimizes for one. Naming that conflict is the whole point of this
research.

| | Persona A — "The Evaluator" | Persona B — "The Overtrader" |
|---|---|---|
| Who | Hiring manager / senior engineer reviewing the repo + live demo | Young retail investor who keeps overtrading |
| Job | "In 60 seconds, decide if this person can build" | "Tell me if I'm being reckless, calm me down" |
| Success | Understands the engineering rigor fast | Feels seen, gets a moment of discipline |
| Time on page | 30–90 seconds, skimming | 2–5 minutes, anxious, re-checking |
| Device | Often mobile (link from LinkedIn/email) | Mobile, often mid-impulse |

The current dashboard is built for **A** (rigor on display, verified chips, the
"never invents numbers" headline). It barely speaks to **B**, who is the actual
monetization persona the plan named.

---

## PERSONA A — "The Evaluator" (confidence: high)

> "I clone 50 of these. Show me it works and that you understand what you built,
> or I close the tab."

- **Archetype:** Technical gatekeeper.
- **Age:** 28–45. **Tech:** expert.
- **Motivations:** filter signal from noise fast; avoid hiring someone who can't finish.
- **Goals:** see the live thing work; grasp the architecture; verify the headline claim.
- **Frustrations:** half-built demos; "AI finance app" cliché; having to read code to
  understand the point; signup walls; cold-start spinners.
- **Behaviors:** skims README first screen, clicks the live URL, glances at the file tree.
- **Design implications:** the rigor IS the hook for A — keep the verified chips, the
  "explains the math, never invents numbers" framing, the instrument aesthetic. A is
  well served today. Risk: don't dumb it down for B and lose A's signal.

## PERSONA B — "The Overtrader" (confidence: medium)

> "I just want to know — am I about to do something stupid again?"

- **Archetype:** Anxious self-aware retail trader (the plan's monetization niche).
- **Age:** 22–35. **Tech:** intermediate. Trades on a phone, often impulsively.
- **Motivations:** avoid the regret of the last blow-up; feel in control; a gut-check.
- **Goals:** a fast, plain read on "how risky am I right now?"; a calmer head; one
  concrete thing to reflect on before acting.
- **Frustrations:** jargon they half-understand (volatility, drawdown, HHI); tools that
  judge without explaining; advice that says "buy/sell" (they want a coach, not a tipster);
  walls of numbers that spike anxiety instead of lowering it.
- **Behaviors:** opens the app mid-impulse; fixates on the scariest number; wants
  reassurance OR a clear "yes, slow down."
- **Design implications:** B needs the score to *mean* something emotionally ("aggressive
  — here's what that feels like in a downturn"), jargon defined inline, the FOMO/discipline
  angle surfaced, and a tone that coaches rather than reports. **B is underserved today.**

---

## JOURNEY MAP — current dashboard

### A — The Evaluator (mostly works)
```
  STAGE        ACTION                       FEELING        FRICTION
  ───────────  ───────────────────────────  ─────────────  ──────────────────────
  Land         hits live URL                neutral        none — instant render ✓
  Scan hero    sees gauge=67, "aggressive"  "ok, it works" none ✓
  Verify       sees verified chips on AI     "oh, nice"     none — this lands ✓
  Architecture wants the repo               curious        must leave to GitHub (ok)
  Decide       "this person can build"      convinced      none ✓
```
A's journey is clean. The redesign must NOT regress it.

### B — The Overtrader (breaks in several places)
```
  STAGE        ACTION                       FEELING            FRICTION
  ───────────  ───────────────────────────  ─────────────────  ──────────────────────
  Land         opens mid-impulse            anxious            "what is this?" — header
                                                               is for a recruiter, not them
  See score    sees 67 / aggressive         alarmed but       what does 67 MEAN? no
                                            unsure             reference, no "so what"
  Read metrics 73.8%, 27.3%, -54%           overwhelmed       jargon undefined; -54%
                                                               spikes fear with no context
  Read AI text "could move around a lot"     slightly calmer   good, but buried below the
                                                               numbers that already scared them
  Checklist    review questions             this is the       BEST part for B — but it's
                                            useful bit         last, smallest, easy to miss
  Leave        no clear next step            unresolved        no "what do I do with this?"
```
**B's emotional arc goes the wrong way**: lands anxious → score alarms → numbers
overwhelm → *then* the calming coach text and the genuinely useful checklist arrive
last, when B may have already bounced. The most valuable content for B is buried.

---

## USABILITY SYNTHESIS — prioritized findings

Severity × persona impact. (A = Evaluator, B = Overtrader.)

| # | Finding | Severity | Hurts |
|---|---------|----------|-------|
| U1 | Risk score has no meaning anchor — "67" with no "so what / what it feels like" | HIGH | B |
| U2 | Jargon (volatility, drawdown, concentration) undefined inline — B half-understands | HIGH | B |
| U3 | The calming coach summary + review checklist (B's most valuable content) sit LAST | HIGH | B |
| U4 | No "what now?" — B leaves with anxiety and no reflective next step | MEDIUM | B |
| U5 | Header tagline ("explains the math, never invents numbers") speaks to A only | LOW | B |
| U6 | -54% drawdown shown raw, no framing — spikes fear without the "historical, illustrative" calm | MEDIUM | B |
| U7 | Gauge has no qualitative band labels (where's "aggressive" vs "moderate" on the arc?) | MEDIUM | A,B |
| U8 | No tooltips on metric tiles — A wants precision, B wants plain words; neither gets either | MEDIUM | A,B |

**The redesign thesis:** keep everything that serves A, and re-sequence + humanize so
B's emotional arc bends DOWN (anxious → understood → calmer → one reflective action).
Serve both by layering: plain-language meaning on top (B), precise numbers + verified
chips underneath (A). Progressive disclosure is the bridge.

# Design exploration — user-authored conditions and the contribution loop

**2026-08-02 · exploration and recommendation. Nothing built. Founder decision required.**

---

## 0. The short verdict

**This is the right idea, and it is the single most important product idea in
the project so far.** It is also the most dangerous thing that could be built
into Entopic, and the difference between those two outcomes is entirely in the
safety model.

One thing worth saying plainly: **you have independently arrived at the
contribution workflow I designed in the Phase 3 Governance Manual (§7)**, from a
completely different direction. I got there from "how does a knowledge base
scale past one author?" You got there from "how does a clinician make this fit
their practice?" Those converge on the same machinery. That convergence is a
good sign that it is the correct shape.

My recommendation is: **build it, in four stages, and never let a user-authored
condition touch the red-flag path.**

---

## 1. Why this matters more than it looks

Three problems it solves at once, all of which are currently listed as blockers
elsewhere in the documentation:

**It breaks the authoring bottleneck.** 394 conditions, 0 verified, one author.
The Phase 3 register says plainly that ~20 hours of *your* time is the highest
value input available — but that gets you verification, not growth. Growth needs
more hands. Right now a cornea specialist who spots an error has no route in
(KD-11). This is that route.

**It makes the engine fit the practice.** Disease mix is local. A clinic seeing
a lot of vernal keratoconjunctivitis, or a particular occupational injury
pattern, or a regional parasitic condition, is currently stuck with a
differential weighted for a different population. Letting the clinician add
what they actually see is not a nicety — it is the difference between a tool
that helps and a tool that argues with them.

**It turns users into contributors, which is the only way a clinical knowledge
base ever gets good.** UpToDate, SNOMED and every serious clinical resource are
maintained by many clinicians, not one. A single-author knowledge base has a
ceiling and you are already close to it.

**And the flow-map preview you described is the best part of the idea.** Not the
authoring — the *seeing*. "Here is how the engine will behave with your
condition in it" turns an abstract data edit into something a clinician can
judge. Nobody else does this. It is also, almost exactly, the impact preview I
recorded as missing (KD-12): a clinician editing a rule cannot currently see
that it would change forty differentials.

---

## 2. The risks, stated honestly

These are not reasons not to build it. They are the specification.

### R1 · A user-authored condition can bury a red flag — **the critical one**

The engine ranks everything in one list from one array. Append a personal
condition and it competes directly with core conditions. A clinician creates
"Evening Dryness — my pattern" requiring `flashes` and `floaters` because those
patients also mention them; it scores 0.8; retinal detachment scores 0.75 and
drops below the fold.

**Nobody did anything wrong and a detachment got buried.** This is the failure
mode that must be structurally impossible, not merely discouraged.

### R2 · Exclusions could suppress a core condition
`exclusions` already exists in the schema. A personal condition that excludes a
core urgent condition would silently remove it from the differential. That
directly violates the standing guardrail that red flags are un-suppressible.

### R3 · A user-set `urgent` flag cuts both ways
If users can set `urgent: true`, alert fatigue arrives fast — and 63 of 394
conditions are already urgent. If they cannot, they cannot encode a genuine
local emergency pattern, which is one of the real reasons to want this.

### R4 · Reproducibility breaks (ADR-004)
Today the same inputs give the same differential, forever, for everyone. That
property is the reason the engine is defensible. With per-user overlays, "the
engine said X" becomes meaningless unless the visit records *which* knowledge
produced it.

### R5 · Regulatory position changes materially (ADR-011)
A device whose diagnostic rules the end user can edit is a substantially
different regulatory proposition from one shipping fixed, reviewed content.
ADR-011 is already undecided; this makes deciding it more urgent, not less.
**This is not a reason to stop — it is a reason to get the answer before this
ships to anyone outside your own practice.**

### R6 · Accountability
The Governance Manual's first principle: *no clinical claim enters Entopic
without a named person accountable for it.* If a clinic uses a condition
authored by user A and published by admin B, and it is wrong, that principle
must still hold.

### R7 · Quality regression at scale
Fifty clinics each adding twenty conditions is a thousand unreviewed
conditions. Without review capacity, the knowledge base gets worse, not better.

---

## 3. The design that makes it safe

### 3.1 Three layers, one direction

```
┌──────────────────────────────────────────────────────┐
│  CORE          shipped, versioned, clinician-signed  │  ← nobody edits
│                394 conditions                        │
├──────────────────────────────────────────────────────┤
│  CLINIC        published by the admin to this clinic  │  ← admin edits
├──────────────────────────────────────────────────────┤
│  PERSONAL      one clinician's own, private           │  ← user edits
└──────────────────────────────────────────────────────┘
```

**Overlays may only ADD.** They can add a new condition, and add supporting
evidence to their own conditions. They can never delete, disable, re-weight or
exclude anything in the layer below.

Wanting to change a core condition is a legitimate need — but it is expressed as
a **proposal**, which goes to review, not as a local override. That keeps one
authoritative version of every shipped condition.

### 3.2 The safety mechanism: two differentials, merged with core on top

This is the part that matters. Do **not** append overlay conditions to
`KNOWLEDGE_ALL` and re-rank.

```
   tokens
     │
     ├──→ CORE engine run     ──→ core differential + core alerts
     │                                    │
     └──→ OVERLAY engine run  ──→ overlay differential
                                          │
                    ┌─────────────────────┘
                    ▼
      MERGE:  1. every core URGENT condition, in core order   ← never displaceable
              2. core non-urgent, in core order
              3. overlay conditions, visually distinct, below
```

Two separate scoring passes over the same tokens. A personal condition
**cannot mathematically outrank a core urgent finding**, because they are never
ranked against each other. R1 and R2 both become impossible by construction
rather than by discipline — and that is the standard this codebase already holds
itself to elsewhere (corrupt stores refuse writes; the engine ignores section
status).

Cost: the engine runs twice. It takes 0.7 ms. This is free.

### 3.3 What each role may author

| | Personal | Clinic (admin) | Core |
|---|---|---|---|
| Add a condition | ✅ private | ✅ published | ❌ proposal only |
| Add own tokens | ✅ | ✅ | ❌ |
| Wire own tokens to own condition | ✅ | ✅ | ❌ |
| Set `urgent: true` | ❌ **never** | ⚠️ with a stated reason, audited | signed content only |
| `exclusions` targeting another condition | ❌ **never** | ❌ **never** | signed content only |
| Edit a core condition | ❌ propose | ❌ propose | Knowledge Owner |
| Publish to others | ❌ | ✅ | ✅ |

**Why users can never set `urgent`:** an urgent flag is a safety claim about
what happens if you miss it. That is exactly the class of claim the Governance
Manual reserves for the Knowledge Owner and says is *never delegated*. A
clinician who believes a pattern is urgent submits it — with a reason — and it
comes back as core content, signed, for everyone. That is a better outcome for
them anyway.

**Why nobody but core may use `exclusions`:** it is the only field that can
*remove* something from a differential.

### 3.4 Always visually distinct — permanently

An overlay condition is never displayed as though it were signed content. Not
"until verified" — always, while it is an overlay. Something like:

> **Evening Dryness — my pattern**  ·  `YOUR CONDITION · not clinically reviewed`

If it becomes core through review, it loses the badge because it is no longer an
overlay. That is the only route to losing it.

### 3.5 Reproducibility (fixes R4)

Every visit records the knowledge that produced its differential:

```
kb_provenance: {
  core_version:    "1.3.1",
  clinic_overlay:  "clinic-7:v4",
  personal_overlay:"user-jsmith:v11",
  overlay_conditions_shown: ["Evening Dryness — my pattern"]
}
```

Cheap, and it means a differential from two years ago can still be explained.
Without this, overlays quietly destroy the property that makes the engine
defensible.

---

## 4. The preview — the best part of your idea

Three views, in increasing order of value.

**(a) The wiring map.** Your flow chart: tokens → this condition → what it
competes with. Uses the existing node-graph. Answers "did I wire this right?"

**(b) Live test bench.** A panel where the author toggles findings on and off
and watches their condition rank in real time, against the core differential.
Answers "does this behave the way I meant?"

**(c) Retrospective impact — the one that prevents harm.**

> *"Run against your last 200 visits: this condition would have appeared in
> **34** differentials. In **6** of those it would have ranked above the
> condition you actually diagnosed."*
>
> *…and then let them click through those 6.*

That is the single most valuable safety feature in the whole proposal. It turns
an abstract authoring decision into evidence about their own practice, before
anything is saved. It also closes KD-12.

All three are computable offline from data already stored. **(c) needs no new
data at all.**

---

## 5. The contribution loop

```
  Clinician authors  ──→  private, badged, in their own differential
         │
         │  "Send to admin"   (one button, as you described)
         ▼
  PROPOSED          ──→  admin queue: what, who, why, impact preview,
         │                 and how often it has actually fired for them
         ▼
  Admin reviews     ──→  publish to clinic  |  return with a comment  |  decline
         │
         │  (if it should be core)
         ▼
  Knowledge Owner   ──→  needs a second reviewer who is not the author,
                          evidence, and a signature  →  ships to everyone
```

Two things I would add to what you described:

**Usage evidence travels with the proposal.** "This has fired in 34 of my last
200 visits and I agreed with it in 31" is far stronger evidence than a
description, and it is already computable. It also filters: a condition that
never fires does not need review.

**The author is credited, permanently.** On the condition, visible in the
product. It is fair, and it is the only real incentive anyone has to contribute.

---

## 6. What I would build, in order

| | Stage | What it delivers | Effort | Gate |
|---|---|---|---|---|
| **1** | **Overlay engine + two-pass merge, no UI** | The safety foundation. Overlays exist, cannot outrank core urgents, provenance recorded. Nothing user-visible. | ~60 h | — |
| **2** | **Personal authoring + wiring map + test bench** | A clinician can add their own condition and see it behave, private only. | ~80 h | after 1 |
| **3** | **Retrospective impact preview** | "Would have changed 6 of your last 200 differentials." | ~40 h | after 2 |
| **4** | **Submission + admin review + clinic publish** | The contribution loop. | ~70 h | ⚠️ ADR-011 |

**~250 hours total.** Stage 1 alone is the thing worth doing first even if the
rest waits, because it is what makes everything after it safe.

**Stage 4 should not ship before the regulatory question (ADR-011) has an
answer**, because publishing user-authored diagnostic logic to other clinics is
precisely the activity that determines how the product is classified.

---

## 6b. STATUS — verified in a browser, 2026-08-03

Every line below was checked by driving the real app, not by reading code.

| Stage | Status | Where it lives |
|---|---|---|
| **1 · Overlay engine + two-pass merge** | **BUILT** | `js/kb-overlay.js`; engine stage 8b |
| **2 · Personal authoring + wiring map + test bench** | **BUILT** | `js/ui-condition-builder.js` |
| **3 · Retrospective impact preview** | **BUILT** | `js/overlay-impact.js` |
| **4 · Submission + admin review + clinic publish** | **MODEL ONLY — no review screen** | `overlaySubmit` / `overlaySubmitted` / `overlayReview` exist and are tested; nothing renders them |

**What was verified working end to end.** A clinician creates "My Evening
Dryness Pattern" requiring `dryness`, supported by `worse_evening` and
`screen_use_exacerbation`. It saves, becomes active, is returned by
`overlayConditions()`, and on a matching visit it fires at 0.72 — appearing
**beneath** the three core dry-eye conditions, marked as an overlay. The
safety model holds in practice: core keeps its own ordering and overlays are
appended, never interleaved.

**Exclusions are refused twice** — rejected by `overlayValidate` and stripped
unconditionally by `overlaySave`. Belt and braces on the one field that could
remove a core condition from a differential.

### What the founder overruled, and what was built instead

§7 listed **user-set urgent flags** under "what I would not build". The founder
decided on 2026-08-02 that clinicians may set them. That decision is
implemented with the mitigations proposed alongside the original concern: an
urgent overlay **appends** an alert after the core alerts rather than merging
into them, the banner carries the author's name and the words "not clinically
reviewed" in its own text, and it auto-submits for review. A mistaken personal
urgent therefore costs an extra line on screen — never a missing red flag. The
mechanism is declared in `knowledge/red-flags.js` as `overlay_urgent`.

### Can a user create a new TOKEN? No — and that is the design

A clinician composes conditions from findings the exam already records. They
cannot invent a finding, because a token only exists if some input path in
`collectTokens()` produces it. Adding a genuinely new finding means adding a
field to the exam and a derivation rule to the engine — a code change, not a
data change.

**This was silently broken until 2026-08-03.** The finding fields were free
text. Typing "evening dryness" produced `evening_dryness`, which nothing
emits, so the condition could never fire — and the chip looked exactly like a
working one. A clinician would have left believing the app was watching for
their pattern. Now: a required finding the engine cannot produce is refused
with the reason, supporting ones are a non-blocking note, and the input is
backed by a picker of all 461 producible findings. Fails open if the generated
registry is missing.

### What Stage 4 still needs

The model layer is complete and tested — submit, list the queue, accept or
decline with a reason. What does not exist is **any screen an administrator
can open to review a submission**. Nothing calls `overlaySubmitted()` or
`overlayReview()` in the UI; `overlayReviewScreen` and `overlayAdminScreen` are
undefined.

That is deliberate and the gate has not moved: **Stage 4 must not ship before
ADR-011 has an answer.** Publishing user-authored diagnostic logic from one
clinic to another is precisely the activity that determines how this product
is regulated. ADR-011 is still **NOT MADE**. Building the review screen is
perhaps 20 hours; shipping it without that decision is the risk.

An interim step that does *not* touch the regulatory question: a clinician can
already submit, and their own submitted conditions stay visible to them. What
is missing is only the cross-user publish path.

---

## 7. What I would not build

| | Why |
|---|---|
| Editable core conditions | One authoritative version, or the sign-off model collapses. Propose instead. |
| User-set urgent flags | A safety claim, never delegated. |
| User exclusions | The only field that can remove a condition from a differential. |
| Overlay conditions in the research corpus | Non-comparable data across clinics silently corrupts prevalence figures. |
| Sharing directly between users | Everything goes through review. Peer-to-peer clinical content with no gate is how bad knowledge spreads fastest. |
| AI-suggested conditions | Violates the founding guardrail. |

---

## 8. Where this lands on the existing registers

It closes, or substantially advances: **KD-11** (no contribution path),
**KD-12** (no impact preview), **KD-05** (144 conditions with no discriminating
test — specialists can fill these), and the Governance Manual's §7 workflow.

It creates: a hard dependency on **ADR-011**, pressure on **ADR-010**
(server-enforced authorization — publishing to a clinic cannot be a client-side
permission), and a new **KD** item for overlay review capacity (R7).

---

## 9. The three decisions I need from you

1. **Build it?** My recommendation: **yes — stages 1 to 3.** Stage 4 after
   ADR-011.
2. **Personal-only first, or clinic publishing straight away?** My
   recommendation: **personal-only first.** It is safe, it is useful on day one,
   and it generates the evidence that tells you whether the review workflow is
   worth building.
3. **Am I right that users must never set `urgent`?** This is a clinical
   judgement and it is yours. My recommendation is a firm no — but if you think
   a clinician should be able to flag a local emergency pattern, the compromise
   is that it fires **only for them**, marked as their own flag, and is
   auto-submitted for review.

---

## 10. One last thing

This idea also quietly solves a problem I have flagged in every phase and could
not solve for you: **the 394 unverified conditions are unverified because one
person has to verify them all.**

A contribution loop with real review capacity is how that number starts moving
without it all being your evenings. It does not replace your signature on the
core knowledge — nothing does — but it means the *next* 394 conditions do not
have to be written by you alone.

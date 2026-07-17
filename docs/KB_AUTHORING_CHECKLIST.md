# KB Expansion — Definition of Done for every new condition

**Standard (founder directive, 2026-07-17):** a condition is not "added" until it
ships **both** its engine inputs **and** its "About" content. Volume is never an
excuse to drop either. Most of this is enforced automatically by the test suite —
this doc is the human-readable contract, and the tests are the teeth.

## 1. Engine inputs (so the condition actually works)

- [ ] **Required token(s)** (`req`) — the hallmark evidence. At least one, and
      every one must be **reachable**: some clickable exam input (symptom chip,
      slit-lamp/fundus finding, structured field, or measurement) must emit it.
      *Enforced:* `kb-token-health`, `kb-ui-reachability`, `kb-expansion`
      ("every REQUIRED token is reachable").
- [ ] **Supportive (`sup`) and contradicting (`con`) findings** — real rule-in and
      rule-out power. New conditions must carry contradicting findings and a
      non-thin profile (≥ ~8 firing tokens). *Enforced:* `kb-expansion`
      (RICHNESS), `kb-token-health`.
- [ ] **Surfaces on its own evidence** — the real engine ranks it when its req +
      a few sup tokens are present. *Enforced:* `kb-expansion` ("the REAL engine
      surfaces each expansion condition").
- [ ] **No cross-conflict regression** — it doesn't swamp or get buried by rivals,
      and doesn't create cross-domain junk. *Enforced:* `kb-cross-conflict`.
- [ ] **Tokens declared** in the registry; regenerate with
      `node tools/gen-token-registry.js` after adding any new token.
      *Enforced:* `token-registry`.
- [ ] **ICD-10 code** (`icd` + `icd_label`) **when known and verifiable.** Never
      invent one — if unknown, leave it blank or set `icd_status:
      "NEEDS_CLINICAL_REVIEW"`. Prefer looking codes up from a real source (the
      ICD-10 tooling) over guessing. *(Currently ~197 legacy conditions still
      lack a code — a backlog to fill with verified codes, never fabricated.)*
- [ ] **Provisional flag** — `review_status: "NEEDS_CLINICAL_REVIEW"` so it enters
      the founder's review queue. *Enforced:* `kb-expansion` ("runtime review
      flag").

## 2. "About" content (so the clinician gets a reference)

- [ ] **Hand-author a `CONDITION_INFO` note for EVERY new condition — none left
      out** (founder requirement). Write a short qualitative paragraph + a few key
      facts. Keep it **qualitative** — *no* invented statistics, thresholds, doses,
      ICD codes, or citations — and set `review: true` until the founder verifies
      it. *Enforced:* `condition-info` ("EVERY KB condition has a hand-authored
      note (none left on the derived fallback)").
- [ ] **The derived profile is only a safety net.** If a note is somehow missing,
      the toggle still shows a profile auto-derived from the condition's own
      `req`/`sup`/`con`/ICD (`knowledge/condition-info.js` →
      `buildConditionProfile`), so "About" is never blank — but every shipped
      condition must carry a real hand-written note per the rule above.
- [ ] **About stays tied to the engine.** Because the derived profile is built
      from the same tokens the engine scores on, and the advisory panel's "In this
      patient" block is built from the engine's live evidence trail, the reference
      card and the engine can never drift apart. Reference prose is **display-only
      — it must never feed scoring** (hard guardrail: diagnosis stays
      deterministic).

## 3. The one-line rule

> New condition = **reachable req token + rule-out power + surfaces on its own
> evidence + no cross-conflict + review-flagged + About content (derived or
> authored) tied to those same tokens.** If any is missing, it isn't done.

Run `npm test` before committing any batch — the gates above will catch a
condition that violates this standard.

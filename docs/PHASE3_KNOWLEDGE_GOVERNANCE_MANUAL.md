# Entopic — Knowledge Governance Manual

**Phase 3 · 2026-08-02**

How clinical knowledge gets in, gets checked, gets changed, and gets retired.
Written to be adopted now at solo scale and to survive a university
contributing to it later.

---

## 1. The principle everything else follows from

> **No clinical claim enters Entopic without a named person accountable for it.**

Not "without a source" — sources can be wrong and sometimes are not available.
**Without a person.** Every condition, every threshold, every alert must trace
to someone who put their name to it and can be asked why.

Today that person is the founder for all 394 conditions, and none of them are
signed yet. That is the gap this manual exists to close and then to keep closed
as more people contribute.

---

## 2. Roles

| Role | Who | May |
|---|---|---|
| **Knowledge Owner** | The founder | Approve anything; final say on clinical content; the only role that can publish |
| **Domain Reviewer** | A specialist (cornea, glaucoma, retina, neuro, paeds) | Review and sign conditions in their domain; propose changes |
| **Contributor** | Faculty, residents, other clinicians | Propose changes with evidence; cannot publish |
| **Knowledge Engineer** | Whoever maintains the code | Change schema, tooling, validation; **may never change clinical meaning** |
| **Auditor** | External, e.g. a regulator or an institution | Read everything, including the full change history |

**The rule that keeps the engineer honest:** a knowledge engineer may change how
knowledge is *stored, validated and delivered*, and may never change what it
*says*. If a schema migration would alter clinical meaning, it stops and goes to
the Knowledge Owner. This is the same boundary that already stops the LLM
diagnosing.

---

## 3. Condition lifecycle

```
  DRAFT ──→ PROPOSED ──→ UNDER REVIEW ──→ VERIFIED ──→ (content edited) ──→ STALE
    │                          │                                              │
    │                          └──→ REJECTED (kept, with the reason)          │
    └───────────────────────────────────────────────────────────────────────┘
```

| State | Meaning | Visible to clinicians as |
|---|---|---|
| `DRAFT` | Being authored | Not shown |
| `NEEDS_CLINICAL_REVIEW` | In the KB, unverified | **Shown, marked provisional** ← all 394 today |
| `UNDER_REVIEW` | Assigned to a reviewer | Shown, marked provisional |
| `VERIFIED_BY_CLINICIAN` | Signed, hash-bound | Shown as verified |
| `STALE` | Was verified; content has since changed | **Shown, marked provisional again** |
| `DEPRECATED` | Withdrawn | Not shown; retained in history |

**Two properties already implemented and worth protecting:**
- Unknown state ⇒ unverified (ADR-009). Fail closed, always.
- A sign-off is bound to a **hash of the clinical fields**, so editing content
  automatically returns it to provisional. Verification cannot be inherited by
  changed content.

---

## 4. What a review actually requires

A reviewer signing a condition is asserting all of the following. If any cannot
be asserted, the condition stays provisional.

1. The **name** is the term a clinician in this setting would use.
2. The **required tokens** are genuinely required — the condition cannot
   reasonably present without them.
3. The **supporting tokens** genuinely support, and none of them is actually a
   requirement in disguise.
4. The **contradicting tokens** genuinely argue against.
5. The **urgent flag** is correct in both directions — set when it must fire,
   and *not* set when it would cause alert fatigue.
6. The **ICD-10 code** is the right code.
7. The **discriminating tests** would actually discriminate.
8. Nothing stated is **fabricated** — every clinical claim is either sourced,
   or obviously true to a specialist, or removed.

Point 5 deserves emphasis. Over-flagging is a safety failure, not a safe
default: 63 of 394 conditions are urgent today, and if a routine clinic
generates frequent alerts, clinicians learn to dismiss them.

---

## 5. Evidence governance

### Grades
Entopic will not invent an evidence-grading scheme. Adopt one grade vocabulary
and record which one:

| Grade | Meaning |
|---|---|
| `guideline` | A named guideline, with edition and year |
| `primary` | A specific study, with DOI or PMID |
| `textbook` | A standard reference, with edition and page |
| `expert` | A named clinician's judgement, no published source |
| `none` | No source stated — **must not be VERIFIED** |

### The rule
**A condition may not reach `VERIFIED_BY_CLINICIAN` while carrying a claim
graded `none`.** Either cite it, downgrade it to `expert` with a named person,
or remove the claim.

### The shape
`knowledge/clinical-scales.js` already does this correctly and is the template:

```
source:   { citation, doi_or_pmid, year, edition }
verbatim: "the exact sentence from the source"
```

The `verbatim` field matters more than it looks: it makes a paraphrase
detectable. If the stored sentence does not support the rule, anyone can see it.

### What must never happen
No citation, DOI, PMID, sensitivity, specificity, likelihood ratio, threshold
or guideline claim may ever be written unless it has been read. A fabricated
citation is worse than no citation, because it survives review by *looking*
rigorous. This has already happened once in this repository — `js/risk-calc.js`
contained invented OHTS percentages and is now quarantined.

---

## 6. Change control

**Every knowledge change records:** what changed (field-level), who, when, why,
what evidence, and which review state it moved to.

**Change classes:**

| Class | Example | Requires |
|---|---|---|
| **Editorial** | Fix a typo in narrative text | Knowledge Engineer |
| **Clarifying** | Add a synonym; add a discriminating test | Domain Reviewer |
| **Clinical** | Change `req`/`sup`/`con`; change a threshold | Domain Reviewer + Owner |
| **Safety** | Add, remove or alter an `urgent` flag | **Owner only, never delegated** |
| **Structural** | Schema change | Engineer + Owner, with a migration plan |

**Safety changes are never delegated.** Removing an urgent flag is the single
most dangerous edit available in this system.

---

## 7. Contribution workflow (for when it is needed)

Not built yet. Designed here so it can be built without redesign.

```
  Contributor proposes
        │  condition + evidence + rationale
        ▼
  Validation (automatic)
        │  schema · tokens registered · ICD valid · no duplicate name
        ▼
  Domain Reviewer
        │  the eight assertions in §4
        ▼
  Knowledge Owner
        │  publish / reject / return
        ▼
  Versioned KB bundle → clinics
```

**Two contributors, never one.** A condition should require a Domain Reviewer
who is not its author. Self-approval is how unverified content becomes verified
content without anything changing.

**University contributions.** A department contributing content should be
credited on the condition and able to see it in the shipped product. That is
both fair and the main incentive for anyone to contribute.

---

## 8. Versioning and release

- `KB_VERSION` is semver and **separate from `APP_VERSION`** — already
  implemented and correct. Knowledge and code release independently.
- **Patch** — narrative, typos, synonyms. **Minor** — new conditions, new
  evidence. **Major** — schema change, or any change to urgent flags.
- A shipped bundle carries: version, condition count, verified count, and the
  hash of every condition.
- **A clinic must be able to see which KB version produced a historical
  differential.** Not yet possible; required before any regulated use, and
  before any research claim about historical differentials.

---

## 9. Deprecation

Conditions are **never deleted**. A withdrawn condition becomes `DEPRECATED`
with a reason and a date, and remains in history, because visits diagnosed
against it still exist and their reasoning must remain reconstructible.

---

## 10. Audit

Already in place: an audit trail of sign-offs, hash-bound verifications, and
`kb_signoffs` mirrored and backed up.

Not yet in place, and needed before regulated use:
- Field-level change history for knowledge (who changed `req` on this condition,
  when, and why)
- The ability to reconstruct any historical KB version exactly
- An exportable review pack for an auditor

---

## 11. Adopt this in the right order

**Now, at solo scale:**
1. Start signing conditions. 20 hours. Nothing else in this manual matters until
   this begins.
2. Add the evidence field to the schema, even if it starts empty.
3. Write the safety-change rule down and follow it.

**When a second reviewer joins:**
4. Two-person rule for clinical changes.
5. Domain assignment.

**Before any university or external contribution:**
6. The full workflow in §7.
7. Field-level change history.
8. The auditor export.

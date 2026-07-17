# Reference Library & Living-Research — Exploration & Plan

**Status: PROPOSAL for founder review. Nothing here is built yet.**
This document explores how Entopic could act like a *continuously-updated
reference textbook* — surfacing evidence-graded research/guidelines per
condition, extracting the useful bits, and aiding (advisory-only) the
differential — **without breaking any hard guardrail.** It ends with a short
list of decisions only the founder can make (spend, sources, scope).

The "ⓘ About this condition" toggle already shipped (Session 10) is the **UI
shell** this plan slots into: today it shows a provisional plain-language
summary; this plan is about filling that shell with *real, cited, evidence-
graded* content that can be refreshed over time.

---

## 1. The core tension, and how we resolve it

The ask ("regularly updating research and studies") sounds like it needs live
internet in the exam room. That would collide head-on with **offline-first**
(the diagnostic path must run with no network) and with **privacy** (nothing
about a patient should ever touch a third-party API).

**Resolution — separate *curation* from *use*:**

- **Curation happens centrally, ahead of time** (my side, or a scheduled job) —
  never in the exam. It queries vetted research sources, assembles a small,
  evidence-graded reference set per condition, and bakes it into a **versioned
  reference pack**.
- **Use happens offline, in the app.** The app reads the bundled pack. "Regularly
  updating" = new pack *versions*, distributed through the **same sync channel
  the KB already uses** — reviewed before release, exactly like the KB.

So the app never calls a research API during an exam; the network is only ever
touched by the optional curation pipeline, on de-identified, condition-level
queries (never patient data).

```
   ┌─────────────────────────┐        ┌──────────────────────┐        ┌────────────────────┐
   │  CURATION PIPELINE       │  ───▶  │  reference-pack.json  │  ───▶  │  OFFLINE VIEWER     │
   │  (central, periodic,     │  ships │  (versioned, evidence │  sync  │  in the app —       │
   │   founder-reviewed)      │        │   -graded, source-    │        │  the ⓘ toggle +     │
   │  PubMed / guidelines /   │        │   linked, provisional │        │  a KB-wide library  │
   │  ICD, optional LLM       │        │   until verified)     │        │  browser. No net    │
   │  *extractive* summary    │        └──────────────────────┘        │  in the exam path.  │
   └─────────────────────────┘                                         └────────────────────┘
```

---

## 2. How every guardrail stays intact

| Guardrail | How this design honours it |
|---|---|
| **Offline-first is sacred** | Reference content is bundled/synced, read locally. No research API in the diagnostic or exam path — ever. |
| **Never fabricate clinical content** | Every reference item carries a **real, verifiable source** (PMID + DOI, or a named guideline + URL). No item exists without a citation. If a fact can't be sourced, it isn't shown. |
| **LLM strictly downstream, never diagnoses** | An LLM may only *extractively summarise a real, fetched abstract/guideline* — it never invents facts and never generates a differential. Every AI summary is (a) tied to its cited source and (b) labelled "AI-summarised — provisional". Diagnosis stays 100% in the deterministic engine. |
| **Reference content never re-enters scoring** | The engine keeps reading only the structured req/sup/con tokens. Reference prose is **display-only**, shown beside the differential, so the engine stays deterministic and inspectable. |
| **Privacy / no PII to third parties** | Curation queries are by **condition/token only** (e.g. "anterior uveitis management"), never patient identifiers. Curation is central and offline-from-the-patient; the device never sends anything. |
| **Spend is founder-gated** | The runtime app stays free and offline. Costs (research API volume, LLM summarisation) live entirely in the **optional** curation pipeline and are opt-in per phase. |
| **Evolve, don't replace** | This extends the existing advisory panel + the new ⓘ toggle. No teardown. |

---

## 3. What a curated reference item looks like (concrete, real)

The research tooling returns real, citable material today. Two genuine examples
retrieved for *anterior uveitis* (**source: PubMed**):

- Agrawal R, et al. *Collaborative Ocular Tuberculosis Study Consensus
  Guidelines … Report 2.* **Ophthalmology**, 2020;128(2):277–287.
  [DOI](https://doi.org/10.1016/j.ophtha.2020.06.052) — Practice Guideline /
  Consensus Statement.
- Foeldvari I, et al. *New and Updated Recommendations for the Treatment of
  Juvenile Idiopathic Arthritis-Associated Uveitis and Idiopathic Chronic
  Anterior Uveitis.* **Arthritis Care Res**, 2023;75(5):975–982.
  [DOI](https://doi.org/10.1002/acr.24963) — Systematic Review.

A reference-pack entry would store, per condition, a handful of such items:

```jsonc
// reference-pack.json  (illustrative shape)
{
  "version": "2026.07.0",
  "reviewed_by": null,            // founder sign-off stamp; null = provisional
  "conditions": {
    "Anterior Uveitis (Acute)": {
      "takeaways": [               // short, source-linked, clinician-facing
        { "text": "Recurrent/bilateral or granulomatous cases warrant a systemic work-up.",
          "grade": "guideline",    // see §5 grading
          "source": { "type": "practice_guideline", "pmid": "32603726",
                      "doi": "10.1016/j.ophtha.2020.06.052", "year": 2020 } }
      ],
      "references": [ /* full citation list, links open only when online */ ],
      "ai_summary": null,          // optional extractive summary of a real abstract, labelled
      "last_reviewed": null
    }
  }
}
```

Nothing here is invented: text is either the source's own wording/paraphrase
with the source attached, or an LLM extractive summary *of that fetched source*,
clearly labelled and still pointing at the citation.

---

## 4. In-app experience (offline, evolves the current UI)

- **Entry point = the ⓘ toggle** already on each differential. Today it shows the
  provisional summary; with a pack loaded it also shows: 2–4 evidence-graded
  **takeaways**, a **citations** list (tap opens the DOI *only when online*), and
  a **"last reviewed / pack version"** stamp.
- **Reference Library browser** — a KB-wide, searchable reading view (the current
  KB modal grows a "Library" mode): browse any condition's summary + citations
  like a pocket textbook, fully offline.
- **In the "Check next" loop** — a discriminating test can show *why* it
  discriminates, with the source, so the refinement loop is teachable.
- **Evidence-grade chips** can annotate a condition (display-only), so the
  clinician sees at a glance whether guidance is well-established or thin — never
  as a number fed to scoring.

---

## 5. Evidence grading (transparent, not invented)

A deliberately simple, defensible scheme based on **source type + recency** —
*not* fabricated likelihood ratios or sensitivity/specificity values:

- `guideline` — society / consensus practice guideline (e.g. AAO PPP, RCOphth).
- `systematic_review` — systematic review / meta-analysis.
- `primary` — individual study (trial / cohort).
- `background` — narrative review / textbook-level orientation.

The grade plus the **actual citation** are shown together, so the clinician
judges the strength themselves. We never assert a statistic Entopic can't cite.

---

## 6. Phasing (each phase independently shippable & reversible)

- **Phase 0 — DONE (Session 10).** The offline ⓘ toggle: UI shell + the
  provisional/verification model. The reference pack slots straight into this.
- **Phase 1 — Curate real packs, ZERO new spend.** I hand-curate source-linked
  reference packs for the ~31 conditions that already have ⓘ summaries, using the
  research tools I already have. Each takeaway carries a real citation; **you
  verify**, then we flip it from provisional to verified. Deliverable: a reviewed
  `reference-pack.json` + a small integrity test (every item has a citation).
- **Phase 2 — Offline viewer + Library browser.** Render packs in the ⓘ toggle and
  add the KB-wide reading view. Pure front-end, offline, no spend.
- **Phase 3 — Automated refresh (FOUNDER-GATED SPEND).** A scheduled curation job
  that re-queries sources and drafts updated packs (optionally with LLM
  extractive summaries of real abstracts). **Every release is reviewed before it
  ships.** Needs a provider + budget decision.
- **Phase 4 — Optional "look up latest" (FOUNDER-GATED).** An explicit,
  online-only, non-exam-path button that fetches newer papers on demand. No PII,
  never automatic. Only if you want it.

---

## 7. Costs — what's free vs. what isn't

- **Free / no new spend:** Phases 1 & 2 (manual curation with existing tooling +
  offline rendering). This already delivers most of the value: a real, cited,
  offline reference library inside Entopic.
- **Costs money (later, opt-in):** Phase 3's automated refresh — research-API
  volume and, if used, LLM summarisation tokens. Phase 4's on-demand lookups.
  Both are bounded, gated, and outside the runtime app.

---

## 8. Decisions for the founder (please weigh in)

1. **Spend appetite.** Recommend we do **Phase 1 + 2 now with no new spend**, you
   review the result, and we decide on the paid automated refresh (Phase 3) only
   after you've seen it in action. Agree?
2. **Which sources to trust.** PubMed is wired and working. Which guideline
   bodies should we privilege for eye care — e.g. **AAO Preferred Practice
   Patterns**, **Royal College of Ophthalmologists**, regional bodies relevant to
   your practice? (Clinical/product call — your authority.)
3. **Scope & depth.** Start with the ~31 common conditions (matching the current
   ⓘ set), or a different priority list? How many citations per condition feels
   useful vs. noisy — 2–3?
4. **On-demand online lookup (Phase 4).** Do you want a "find newer papers"
   button at all, or is a periodically-refreshed offline pack enough?

---

## 9. Recommendation

Start **Phase 1** next: I curate real, source-linked reference packs for the
existing ⓘ conditions at **no new cost**, you verify the clinical content, and we
ship it into the toggle you've already seen — turning today's provisional
summaries into a cited, offline, evidence-graded mini-textbook. Defer any paid or
automated pipeline until you've used it and decided the spend is worth it.

*(Attribution note: any research surfaced via PubMed will always carry PubMed
attribution and the article DOI link, per PubMed's terms — this is baked into the
curation step.)*

# CONTINUE HERE — handoff for the next session

Everything from this build is saved in git (this branch) + `CHANGELOG.md` (the
full what/why/idea history, newest first). To continue in a new conversation,
just start a session on this repo/branch and read, in order: **`CLAUDE.md` →
`ARCHITECTURE.md` → `CHANGELOG.md`**, then scan the repo.

## Current state (2026-07-17)
- **383 conditions** in the KB — **every one** has an ICD-10 code AND a
  hand-written "About" note (0 missing). All wired to the deterministic engine.
- Engine reads all structured exam fields; About toggle shows a live "In this
  patient" evidence block. KB search now matches signs/synonyms/findings.
- **178/178 tests pass.** App boots clean. Red-flag alerts intact.
- Branch: `claude/entopic-architecture-review-g79amg` (all work pushed).

## What was in flight (pick up here)
1. **"+20 common conditions per area" drive** — done so far: Lens +10,
   Refractive +3, Binocular +3, Retina +11, Surface & Lids +11. **Still to do:
   Glaucoma, Anterior/Uveitis, Cornea, Neuro-Ophthalmic.**
   - Pattern per batch: add clickable finding/chip → token (data-model.js +
     finding-token-map.js), add condition(s) to `knowledge/expansion.js`, validate
     an ICD-10 code (ICD-10 MCP tool) into `knowledge/icd-map.js`, write a note in
     `knowledge/condition-info.js`, `node tools/gen-token-registry.js`, then
     `npm test` (kb-expansion + kb-cross-conflict gates must stay green), commit.
     See `docs/KB_AUTHORING_CHECKLIST.md`.
2. **Founder verification** of the ~290 provisional (`NEEDS_CLINICAL_REVIEW`)
   ICD codes and About notes — a proposed **review-queue screen** to approve them
   in batches has NOT been built yet (good next feature).
3. Known small backlog: a few lid-carcinoma ICD codes carry a placeholder
   laterality to set per patient; a "Retinal Break/Tear" KB entry could take
   `retinal_break` as a required token.

## Guardrails (unchanged, non-negotiable) — see CLAUDE.md
Advisory-only; red flags un-suppressible; LLM never diagnoses; never fabricate
clinical facts/codes/stats (validate ICD via the tool, mark NEEDS_CLINICAL_REVIEW);
offline-first; keep the existing UI; pause before spend/architecture-committing
moves.

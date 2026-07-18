# CONTINUE HERE — handoff for the next session

Everything from this build is saved in git (this branch) + `CHANGELOG.md` (the
full what/why/idea history, newest first). To continue in a new conversation,
just start a session on this repo/branch and read, in order: **`CLAUDE.md` →
`ARCHITECTURE.md` → `CHANGELOG.md`**, then scan the repo.

## Current state (2026-07-18)
- **384 conditions** in the KB — every one has an ICD-10 code AND a hand-written
  "About" note. All wired to the deterministic engine. **227/227 tests pass.**
- **Reasoning-views layer** (Vision Moves 1+4): SOAP note generated from the
  engine's reasoning state; de-identified **teaching casebook** (grouped by
  condition, filterable by sign/token/area/reviewed) on the homepage.
- **Roles & modes (Phase 1, refined)**: Student / Clinician / Faculty
  workspaces with per-role tabs on one switchable account; role chosen at
  signup; free tier limits SAVING only (15 real patients / 40 cases) — learning
  and student practice exams are uncapped. Student quiz (Easy/Standard/Hard,
  KB+casebook vignettes, streaks); Faculty annotate + reviewed sign-off.
- **Super admin**: id `entopic-admin` (password hash-stored, changeable in the
  Admin panel) — everything unlocked at full limits + Admin tab (accounts,
  stats, password change, KB editor, export/import). Client-side convenience
  lock only; real auth is Phase 2.
- **Rapid Clinical Review Queue** (Admin tab, `js/kb-review.js`): ~246
  provisional entries listed with findings/urgency/ICD/summary; one-click
  Verify flips them to VERIFIED_BY_CLINICIAN (persists via the kb-remote
  local-edits overlay; provisional chips clear across the UI).
- Branch: `claude/entopic-architecture-review-g79amg` (all work pushed).

## What was in flight (pick up here)
1. **Founder reviews** the provisional queue in-app; sign-offs live in the
   `entopic_kb_local_edits` localStorage overlay. A future session could add
   "export sign-offs" → bake `VERIFIED_BY_CLINICIAN` into the source KB files.
2. **"+20 common conditions per area" drive** (founder-requested, paused):
   still to do — Glaucoma, Anterior/Uveitis, Cornea, Neuro-Ophthalmic.
   Pattern per batch: `docs/KB_AUTHORING_CHECKLIST.md`.
3. **Phase 2 (founder-gated — needs his go + spend decisions):** real backend
   accounts/licensing (paid tiers become enforceable), hospital/multi-clinician/
   researcher/demonstrator modes, faculty↔student logbooks across accounts.
4. Optional next: founder-verified "common conditions" list
   (NEEDS_CLINICAL_REVIEW flow) for true common/rare quiz tiers; Present mode
   for conferences; export-approvals tool for item 1.
5. Known small backlog: a few lid-carcinoma ICD codes carry a placeholder
   laterality to set per patient; a "Retinal Break/Tear" KB entry could take
   `retinal_break` as a required token.

## Guardrails (unchanged, non-negotiable) — see CLAUDE.md
Advisory-only; red flags un-suppressible; LLM never diagnoses; never fabricate
clinical facts/codes/stats (validate ICD via the tool, mark
NEEDS_CLINICAL_REVIEW); offline-first; keep the existing UI; pause before
spend/architecture-committing moves. Learning is never gated behind a tier.
